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
from dotenv import load_dotenv
from typing import Optional, List, Dict, Any
import json, ulid, requests
from datetime import datetime, timedelta

from base_models import * 
from services.nlp_service import call_gemini
from services.flight_service import amadeus_search_flights
from services.hotel_service import amadeus_search_hotels
from services.attractions_service import amadeus_search_attractions
from services.rental_car_service import car_search_mock, infer_car_types_by_pax
from services.utils import merge_slots_preserve_id, pick_near_target
from services.packages_service import build_three_budget_packages
from services.config import BACKEND_SERVICE_BASE_URL

load_dotenv()

app = FastAPI (
        title = "TWOS AI NLP Testing",
        description="AI-powered Travel planner",
        version="1.0.0"
    )

# Load rental car data once when the app starts
with open("car_list_mock.json") as f:
    CARS_DATA = json.load(f)


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
        
        # Prepare persistence payload
        persist_payload = {
            "user_id": user_id,
            "chat_id": chat_id,
            "current_slots": current_slots,
            "returned_slots": returned_slots,
            "slot_id": slot_id,
            "message": message,
            "ai_response": ai_response,
            "is_complete_plan": is_complete_plan
        }
        
        # Call backend persistence endpoint (fire and forget)
        backend_url = f"{BACKEND_SERVICE_BASE_URL}/api/v1/persist-chat"
        print(f"🔄 Calling backend to persist data: {backend_url}")
        
        response = requests.post(
            backend_url,
            json=persist_payload,
            timeout=10.0  # Short timeout since we don't want to block
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Backend persistence successful: {result.get('message', 'OK')}")
        else:
            print(f"⚠️ Backend persistence returned status {response.status_code}: {response.text}")
    
    except requests.exceptions.Timeout:
        print("⚠️ Backend persistence request timed out (non-critical)")
    except requests.exceptions.ConnectionError:
        print(f"⚠️ Could not connect to backend at {BACKEND_SERVICE_BASE_URL} (non-critical)")
    except Exception as e:
        print(f"⚠️ Error calling backend persistence endpoint (non-critical): {e}")


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
def chat(request: ChatRequest):
    """
    Enhanced chat endpoint that handles both parsing and searching:
    - Parses the user's natural language message to fill or update travel slots
    - If all required information is provided (missing list is empty), automatically searches for travel options
    - If information is missing, returns ParseResponse to ask for clarification
    - For revisions, preserves slot_id and detects when user is modifying existing complete slots

    FE sends: { message, current_slots }
    BE returns: 
    - ParseResponse { slots, missing, reply } if information is missing
    - TravelOptionsResponse { plan_id, slot_id, flight, hotel, attractions, timestamps } if complete
    
    Revision Detection:
    - Detects revisions by checking if current_slots already contains complete travel information
    - For both new plans and revisions: generates new plan_id and timestamps
    - Preserves slot_id across all interactions for conversation continuity
    """

    # 1) Normalize current slots & guarantee slot_id
    current_slots = request.current_slots or Slots()  # Slots validator auto-assigns slot_id
                                                      # If FE sent slot_id:null, validator also assigns a new id

    # 2) LLM revise/fill and read parsed fields
    result = call_gemini(request.message, current_slots)

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
        print("SLOTS PARSE ERROR", repr(e), "payload", slots_dict)
        new_current_slots = current_slots

    # 4) Check if we have all required information
    if not missing:
        print("\n✅ All slots filled, proceeding with search...")
        
        print("\n🆕 New plan creation - first time providing complete information")
        plan_id = ulid.new().str
        created_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        updated_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        flight : Optional[FlightOption] = None
        hotel : Optional[HotelOption] = None
        car : Optional[CarOption] = None
        attractions_list : List[AttractionOption] = []

        # print(f"\nCurrent_Slots: {new_current_slots}\n")

        # --- Flight Search ---
        can_search_flights = all ([
            new_current_slots.origin_airport_code,
            new_current_slots.destination_airport_code,
            new_current_slots.dates.start,
            new_current_slots.pax.adults is not None
        ])
        print(f"\n✅ CAN SEARCH FLIGHTS: {can_search_flights} ✅")
        flight_total_price = 0

        if can_search_flights:
            print("🛩️ Searching for flights...")
            try:
                flight_results = amadeus_search_flights(new_current_slots)
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
                        print(selected_flight)
                        print(f"\n✈️ Selected flight (total for {pax_total}): ${total_price:.2f} | Each: {selected_flight.get('price_per_person', 0.0)}")
            except Exception as e:
                print("🔴 Flight search failed 🔴: ", repr(e))


        # --- Hotel Search ---
        can_search_hotels = all([
            new_current_slots.hotel.request,    # if user didn't want a hotel, this will be false and hotel search will be skipped
            new_current_slots.destination_city_code,    
            new_current_slots.dates.start, new_current_slots.dates.end,
            new_current_slots.pax.adults is not None
        ])
        hotel_total_price = 0

        if can_search_hotels:
            print(f"\n✅ CAN SEARCH HOTELS: {can_search_hotels} ✅")
            print("🏨 Searching for hotels...")

            try:
                hotel_results = amadeus_search_hotels(new_current_slots)
                if hotel_results:
                    target_hotel_budget = (new_current_slots.budget or 0) * 0.30
                    selected_hotel = pick_near_target(hotel_results, 'total_price', target_hotel_budget)
                    if selected_hotel:
                        hotel = HotelOption(**selected_hotel)
                        hotel_total_price = hotel.total_price
                        print(hotel)
                        print(f"\n🏨 Selected hotel near ${target_hotel_budget:.2f}: {hotel.name} at ${hotel.total_price:.2f}\n")
            except Exception as e:
                print("🔴 Hotel search failed 🔴: ", repr(e))
        else:
            print(f"\n✅ HOTEL SEARCH IS SKIPPED ✅")
            

        # --- Attraction Search ---
        can_search_attractions = new_current_slots.destination_city_code is not None
        print(f"\n✅ CAN SEARCH ATTRACTIONS: {can_search_attractions} ✅")
        attraction_total_price = 0

        if can_search_attractions:
            print("🎭 Searching for attractions...")
            attraction_results = amadeus_search_attractions(new_current_slots)
            if attraction_results:
                attractions_list = [AttractionOption(**attr) for attr in attraction_results]
                print(f"\n🎭 Found {len(attractions_list)} attractions.")
    
        # Calculate and normalize attraction prices
        if attractions_list:
            attraction_total_price = sum(attr.price for attr in attractions_list)
            print(f"\nTotal Attraction price: ${attraction_total_price}\n")
        else:
            attraction_total_price = 0
        
        # --- Car Search ---
        can_search_car = new_current_slots.car is True
        print(f"\n✅ CAN SEARCH CAR: {can_search_car} ✅")
        car_total_price = 0

        if can_search_car:
            print("🚗 Searching for car...")
            car = car_search_mock(new_current_slots, CARS_DATA)
            if car:
                print(f"\n🚗 Found {car} car.")
                # Calcuate days of using car based on the start and end information from slot  
                start_date = datetime.strptime(new_current_slots.dates.start, "%Y-%m-%d").date()
                end_date = datetime.strptime(new_current_slots.dates.end, "%Y-%m-%d").date()
                car_days = (end_date - start_date).days
                car_total_price = car.price_per_day * car_days
                print(car)
                print(f"\n🚗 Car rental for {car_days} days at {car.price_per_day}/day = ${car_total_price}\n")
        else:
            print("\n🚗Car Search is SKIPPED🚗")
        
        total_price = flight_total_price + hotel_total_price + car_total_price + attraction_total_price
        print(f"\nThe total price for the travel plan is: ${total_price:.2f}\n")

    
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
            print(f"⚠️ WARNING: slot_id is None, this should not happen. new_current_slots: {new_current_slots}")
            # Fallback: generate a new one
            final_slot_id = ulid.new().str
            print(f"⚠️ Generated new slot_id: {final_slot_id}")

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
        except Exception as e:
            print(f"⚠️ Error calling backend persistence (non-critical): {e}")
        
        return response
    else:
        # Information is missing - return ParseResponse to ask for clarification
        print(f"❌ Missing information: {missing}")
        
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
        except Exception as e:
            print(f"⚠️ Error calling backend persistence (non-critical): {e}")
        
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

"""
@app.post("/preference/update")
def preference_update(request: PreferenceUpdate): 

@app.post("/clarify_for_dev", response_model=ClarifyResponse)
def clarify(request: ClarifyRequest):

    #If there is no missing information
    if not request.missing:
        return ClarifyResponse(question="Anything else to add?")
    
    missing_info_map = {
        "origin_airport_code": "Where are you flying from?",
        "destination_airport_code": "Where are you going?",
        "destination_city_code": "What city are you staying in? (e.g., London)",
        
        "dates": "What dates are you planning to travel?",
        "pax": "How many people are going to travel?",
        "budget": "What's your total travel budget(USD?)",
        "car": "Do you need a rental car during your travel?",
        "hotel": "Any must-have hotel ameities? (ex: breakfast, pool)?"
    }
    
    missing_info = request.missing[0]
    return ClarifyResponse(question=missing_info_map.get(missing_info, f"Could you provide {missing_info}?"))
"""