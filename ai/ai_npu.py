# -------------------------------------------------------------------
# To test API endpoints
# 1. Get you Gemini API key and copy to .env file
# 2. python3 -m venv venv
# 3. source venv/bin/activate
# 4. pip install -U uvicorn fastapi python-dotenv requests ulid-py
# 5. python3 -m uvicorn ai_npu:app --reload --host 0.0.0.0
# 6. Swagger UI: http://127.0.0.1:8000/docs
# 7. deactivate (to close venv)
# -------------------------------------------------------------------

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from typing import Optional, List, Dict, Any
import json, ulid, requests
from datetime import datetime, timedelta
import os

from base_models import * 
from services.nlp_service import call_gemini
from services.flight_service import amadeus_search_flights
from services.hotel_service import amadeus_search_hotels
from services.attractions_service import amadeus_search_attractions
from services.rental_car_service import car_search_mock, infer_car_types_by_pax
from services.utils import merge_slots_preserve_id, pick_near_target
from services.packages_service import build_three_budget_packages
load_dotenv()

from services.config import BACKEND_SERVICE_BASE_URL

app = FastAPI (
        title = "TWOS AI NLP Testing",
        description="AI-powered Travel planner",
        version="1.0.0"
    )

# Configure CORS - Allow all origins for AI service
cors_origins = os.getenv("CORS_ORIGINS", "*")
if cors_origins == "*":
    allow_origins = ["*"]
    allow_credentials = False
else:
    allow_origins = [origin.strip() for origin in cors_origins.split(",")]
    allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load rental car data once when the app starts
with open("car_list_mock.json") as f:
    CARS_DATA = json.load(f)

# Verify environment variables on startup
from services.config import GEMINI_KEY, AMADEUS_KEY, AMADEUS_SECRET
print("=" * 50)
print("AI Service Startup - Environment Check:")
print(f"GEMINI_API_KEY: {'✅ Set' if GEMINI_KEY else '❌ MISSING'}")
print(f"AMADEUS_API_KEY: {'✅ Set' if AMADEUS_KEY else '❌ MISSING'}")
print(f"AMADEUS_API_SECRET: {'✅ Set' if AMADEUS_SECRET else '❌ MISSING'}")
print(f"BACKEND_SERVICE_BASE_URL: {BACKEND_SERVICE_BASE_URL}")
print("=" * 50)


# ------------------------------
# Helper Functions
# ------------------------------

def _persist_to_backend(
    user_id: Optional[str],
    chat_id: Optional[str],
    current_slots: Optional[Dict[str, Any]],
    returned_slots: Dict[str, Any],
    slot_id: str,
    message: str,
    ai_response: Dict[str, Any],
    is_complete_plan: bool
) -> None:
    """
    Call backend service to persist chat data.
    This runs in the background and doesn't block the response.
    
    Args:
        user_id: User ID (optional)
        chat_id: Chat ID (optional)
        current_slots: Original current_slots from request
        returned_slots: Slots from AI response
        slot_id: Final slot_id
        message: User's message
        ai_response: AI service response
        is_complete_plan: Whether this is a complete plan response
    """
    try:
        # Convert slots to dict if they're Pydantic models
        if hasattr(current_slots, 'model_dump'):
            current_slots = current_slots.model_dump(mode='json', exclude_none=True)
        if hasattr(returned_slots, 'model_dump'):
            returned_slots = returned_slots.model_dump(mode='json', exclude_none=True)
        
        # Prepare persistence payload with user_id included
        # user_id will be set if authenticated, otherwise None (anonymous)
        persist_payload = {
            "user_id": user_id,  # Always included - None for anonymous, UUID string for authenticated
            "chat_id": chat_id,
            "current_slots": current_slots,
            "returned_slots": returned_slots,
            "slot_id": slot_id,
            "message": message,
            "ai_response": ai_response,
            "is_complete_plan": is_complete_plan
        }
        
        # Call backend persistence endpoint - include /ai prefix since router is mounted at /ai
        backend_url = f"{BACKEND_SERVICE_BASE_URL}/api/v1/ai/persist-chat"
        
        response = requests.post(
            backend_url,
            json=persist_payload,
            timeout=30.0,  # Increased timeout for database operations
            headers={"Content-Type": "application/json"}
        )
        
        # Silently handle errors - persistence is non-critical
        if response.status_code != 200:
            pass  # Log to error monitoring in production
    
    except Exception:
        # Silently fail - persistence is non-critical and shouldn't block responses
        pass


# ------------------------------
# Endponts
# ------------------------------

@app.get("/")
def root():
    return {"message": "Welcome to the TWOS!"}

# To test the service is alive
@app.get("/health")
def health():
    return {"Live": True, "mode": "AI"}


# Parse the user's request (natural language text) and optionally search for travel options
@app.post("/chat", response_model = ChatResponse)
def chat(
    request: ChatRequest,
):
    """
    Enhanced chat endpoint that handles both parsing and searching.
    Works with or without authentication - anyone can chat, but authenticated users' chats are saved.
    
    - Parses the user's natural language message to fill or update travel slots
    - If all required information is provided (missing list is empty), automatically searches for travel options
    - If information is missing, returns ParseResponse to ask for clarification
    - For revisions, preserves slot_id and detects when user is modifying existing complete slots

    FE sends: { message, current_slots }
    BE returns: 
    - ParseResponse { slots, missing, reply } if information is missing
    - TravelOptionsResponse { plan_id, slot_id, flight, hotel, attractions, timestamps } if complete
    """
    # 1) Normalize current slots & guarantee slot_id
    current_slots = request.current_slots or Slots()  # Slots validator auto-assigns slot_id
                                                      # If FE sent slot_id:null, validator also assigns a new id

    # 2) LLM revise/fill and read parsed fields
    result = call_gemini(request.message, current_slots)
    print(f"========= AI:result: {result}")
    slots_dict = result.get("current_slots", {})
    missing = result.get("missing", [])
    reply = result.get("reply", " ")
    
    # Ensure reply is always a string, not a list
    if isinstance(reply, list):
        reply = " ".join(reply) if reply else " "

    # 3) Merge LLM slots into current slots
    try:
        new_current_slots = merge_slots_preserve_id(current_slots, slots_dict)
    except Exception as e:
        new_current_slots = current_slots

    # 4) Check if we have all required information
    if not missing:
        plan_id = ulid.new().str
        created_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        updated_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        flight : Optional[FlightOption] = None
        hotel : Optional[HotelOption] = None
        car : Optional[CarOption] = None
        attractions_list : List[AttractionOption] = []

        # --- Flight Search ---
        can_search_flights = all ([
            new_current_slots.origin_airport_code,
            new_current_slots.destination_airport_code,
            new_current_slots.dates.start,
            new_current_slots.pax.adults is not None
        ])
        flight_total_price = 0

        if can_search_flights:
            try:
                print(f"Searching flights: {new_current_slots.origin_airport_code} -> {new_current_slots.destination_airport_code}")
                flight_results = amadeus_search_flights(new_current_slots)
                print(f"Flight search returned {len(flight_results) if flight_results else 0} results")
                if flight_results:
                    target_total = (new_current_slots.budget or 0) * 0.35
                    pax_total = (new_current_slots.pax.adults or 0) + (new_current_slots.pax.kids or 0)
                    per_person_target = (target_total / pax_total) if pax_total else target_total
                    selected_flight = pick_near_target(flight_results, 'price', per_person_target)
                    if selected_flight:
                        total_price = selected_flight.get('price_per_person', 0.0) * max(1, pax_total)
                        selected_total = dict(selected_flight)
                        selected_total['price'] = total_price
                        flight = FlightOption(**selected_total)
                        flight_total_price = total_price
                        print(f"Selected flight: {flight.airline} - ${total_price:.2f}")
            except Exception as e:
                print(f"ERROR: Flight search failed: {type(e).__name__}: {e}")
                import traceback
                traceback.print_exc()


        # --- Hotel Search ---
        can_search_hotels = all([
            new_current_slots.hotel.request,    # if user didn't want a hotel, this will be false and hotel search will be skipped
            new_current_slots.destination_city_code,    
            new_current_slots.dates.start, new_current_slots.dates.end,
            new_current_slots.pax.adults is not None
        ])
        hotel_total_price = 0

        if can_search_hotels:
            try:
                print(f"Searching hotels for: {new_current_slots.destination_city_code}")
                hotel_results = amadeus_search_hotels(new_current_slots)
                print(f"Hotel search returned {len(hotel_results) if hotel_results else 0} results")
                if hotel_results:
                    target_hotel_budget = (new_current_slots.budget or 0) * 0.30
                    selected_hotel = pick_near_target(hotel_results, 'total_price', target_hotel_budget)
                    if selected_hotel:
                        hotel = HotelOption(**selected_hotel)
                        hotel_total_price = hotel.total_price
                        print(f"Selected hotel: ${hotel_total_price:.2f}")
            except Exception as e:
                print(f"ERROR: Hotel search failed: {type(e).__name__}: {e}")
                import traceback
                traceback.print_exc()
            

        # --- Attraction Search ---
        can_search_attractions = new_current_slots.destination_city_code is not None
        attraction_total_price = 0

        if can_search_attractions:
            try:
                print(f"Searching attractions for: {new_current_slots.destination_city_code}")
                attraction_results = amadeus_search_attractions(new_current_slots)
                print(f"Attraction search returned {len(attraction_results) if attraction_results else 0} results")
                if attraction_results:
                    attractions_list = [AttractionOption(**attr) for attr in attraction_results]
            except Exception as e:
                print(f"ERROR: Attraction search failed: {type(e).__name__}: {e}")
                import traceback
                traceback.print_exc()
    
        # Calculate and normalize attraction prices
        if attractions_list:
            attraction_total_price = sum(attr.price for attr in attractions_list)
        else:
            attraction_total_price = 0
        
        # --- Car Search ---
        can_search_car = new_current_slots.car is True
        car_total_price = 0

        if can_search_car:
            car = car_search_mock(new_current_slots, CARS_DATA)
            if car:
                # Calculate days of using car based on the start and end information from slot  
                start_date = datetime.strptime(new_current_slots.dates.start, "%Y-%m-%d").date()
                end_date = datetime.strptime(new_current_slots.dates.end, "%Y-%m-%d").date()
                car_days = (end_date - start_date).days
                car_total_price = car.price_per_day * car_days
        
        total_price = flight_total_price + hotel_total_price + car_total_price + attraction_total_price

    
        # Negative = under budget | Positive = over budget
        price_different:float = total_price - (new_current_slots.budget or 0)

        if price_different < 0.0: # Under budget
            reply = f"Your trip total is under your budget!"
            # reply = f"Your trip total is ${total_price:.2f} — that's under your ${new_current_slots.budget:.2f} budget."
        elif price_different == 0.0:
            reply = f"Your trip total is same as your budget!"
            # reply = f"Your trip total is ${total_price:.2f} — that matches your ${new_current_slots.budget:.2f} budget."
        elif 0.0 < price_different <= 200.00:   # Over budget less than $200
            reply = f"Your trip total is just a bit over your budget!"
            # reply = f"Looks like the total comes to ${total_price:.2f}, which is just a bit over your ${new_current_slots.budget:.2f} budget, but it will be awesome!"
        elif 200.00 < price_different:      # Over budget more than $200
            reply = f"Your trip total is quite a bit above your budget!"
            # reply = f"Hmm, this trip totals ${total_price:.2f} — that's quite a bit above your ${new_current_slots.budget:.2f} budget."

        # Ensure slot_id is set (should always be set by validator, but double-check)
        final_slot_id = new_current_slots.slot_id
        if not final_slot_id:
            # Fallback: generate a new one
            final_slot_id = ulid.new().str

        # Prepare AI response for backend persistence
        ai_response_data = {
            "plan_id": plan_id,
            "slot_id": final_slot_id,
            "flight": flight.model_dump(mode='json', exclude_none=True) if flight else None,
            "hotel": hotel.model_dump(mode='json', exclude_none=True) if hotel else None,
            "car": car.model_dump(mode='json', exclude_none=True) if car else None,
            "attractions": [attr.model_dump(mode='json', exclude_none=True) for attr in attractions_list] if attractions_list else [],
            "created_time": created_time,
            "updated_time": updated_time,
            "reply": reply
        }
        
        # Return TravelOptionsResponse with search results
        response = TravelOptionsResponse(
            plan_id = plan_id,
            slot_id = final_slot_id,
            flight = flight,
            hotel = hotel,
            car = car,
            attractions = attractions_list,
            created_time = created_time,
            updated_time = updated_time,
            reply = reply
        )
        
        # Call backend to persist data (fire and forget - non-blocking)
        try:
            _persist_to_backend(
                user_id=request.user_id,
                chat_id=request.chat_id,
                current_slots=request.current_slots,
                returned_slots=new_current_slots.model_dump(mode='json', exclude_none=True),
                slot_id=final_slot_id,
                message=request.message,
                ai_response=ai_response_data,
                is_complete_plan=True
            )
        except Exception:
            pass  # Backend persistence failed, non-critical
        
        return response
    else:
        # Information is missing - return ParseResponse to ask for clarification
        response = ParseResponse(current_slots=new_current_slots, missing=missing, reply=reply)
        
        # Call backend to persist data even for incomplete responses (fire and forget)
        try:
            _persist_to_backend(
                user_id=request.user_id,
                chat_id=request.chat_id,
                current_slots=request.current_slots,
                returned_slots=new_current_slots.model_dump(mode='json', exclude_none=True),
                slot_id=new_current_slots.slot_id,
                message=request.message,
                ai_response={
                    "current_slots": new_current_slots.model_dump(mode='json', exclude_none=True),
                    "missing": missing,
                    "reply": reply
                },
                is_complete_plan=False
            )
        except Exception:
            pass  # Backend persistence failed, non-critical
        
        return response

# ------------------------------------------------------------------------
# For Packages (Three Random Travel Plans)
# Based on the budget: 
#   1. Less than $2K
#   2. $2K - $5K
#   3. More than $5K 
# ------------------------------------------------------------------------
# Generate three random travel plans for budget tiers without explicit slots.
@app.get("/packages")
def get_budget_packages() -> Dict[str, Any]:
    plans = build_three_budget_packages(CARS_DATA)
    return {"by_tier": plans}