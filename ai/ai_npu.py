# -------------------------------------------------------------------
# To test API endpoints
# 1. Get you Gemini API key and copy to .env file
# 2. python3 -m venv venv && source venv/bin/activate && pip install -U uvicorn fastapi python-dotenv requests ulid-py

# 3. source venv/bin/activate
# 4. python3 -m uvicorn ai_npu:app --reload --host 0.0.0.0
# 5. Swagger UI: http://127.0.0.1:8000/docs
# 6. deactivate (to close venv)
# -------------------------------------------------------------------

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from typing import Optional, List, Dict, Any, Union
import json, ulid, requests
from datetime import datetime
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

# --------------------
# Helper Functions
# --------------------

# Cache latest fulfilled plan + slots per slot_id to prevent duplicate generation
PLAN_CACHE: Dict[str, Dict[str, Any]] = {}

# To check random/low signal message from user
# e.g.: ...., miss clicked msgs
# Returns True when the user input is only whitespace/punctuation so we can skip the LLM call.
def is_low_signal_message(message: str) -> bool:
    if not message:
        return True
    stripped = message.strip()
    if not stripped:
        return True
    return not any(ch.isalnum() for ch in stripped)

# LLM Helper - Evaluate which slots are incomplete, so the app not only depend on LLM output.
# It recompute slot fleids after merge the slots
def compute_missing_slots(slots: Slots) -> List[str]:
    missing: List[str] = []

    if not slots.origin_airport_code:
        missing.append("origin_airport_code")
    if not slots.destination_airport_code:
        missing.append("destination_airport_code")
    if not slots.destination_city_name:
        missing.append("destination_city_name")
    if not slots.destination_city_code:
        missing.append("destination_city_code")

    if not slots.dates or not slots.dates.start or not slots.dates.end:
        missing.append("dates")

    pax_adults = slots.pax.adults if slots.pax else None
    if pax_adults is None or pax_adults <= 0:
        missing.append("pax")

    if slots.budget is None:
        missing.append("budget")

    if slots.car is None:
        missing.append("car")

    hotel_request = slots.hotel.request if slots.hotel else None
    if hotel_request is None:
        missing.append("hotel")

    return missing


# Normalize slots and decide which searches need to run again
def extract_compare_fields(raw_slots: Optional[Union[Slots, Dict[str, Any]]]) -> Dict[str, Any]:
    if not raw_slots:
        return {}
    if hasattr(raw_slots, "model_dump"):
        raw_slots = raw_slots.model_dump(mode='json', exclude_none=False)
    dates = raw_slots.get("dates") or {}
    pax = raw_slots.get("pax") or {}
    hotel = raw_slots.get("hotel") or {}
    hotel_amenities = hotel.get("amenities") or []
    attractions = raw_slots.get("attractions") or []
    return {
        "origin_airport_code": raw_slots.get("origin_airport_code"),
        "destination_airport_code": raw_slots.get("destination_airport_code"),
        "destination_city_code": raw_slots.get("destination_city_code"),
        "destination_city_name": raw_slots.get("destination_city_name"),
        "date_start": dates.get("start"),
        "date_end": dates.get("end"),
        "pax_adults": pax.get("adults"),
        "pax_kids": pax.get("kids"),
        "budget": raw_slots.get("budget"),
        "hotel_request": hotel.get("request"),
        "hotel_amenities": tuple(sorted(hotel_amenities)),
        "hotel_rating": hotel.get("rating"),
        "attractions": tuple(sorted(attractions)),
        "car": raw_slots.get("car"),
    }


def detect_refresh_actions(previous_slots: Optional[Union[Slots, Dict[str, Any]]], new_slots: Slots) -> Dict[str, bool]:
    current_view = extract_compare_fields(new_slots)
    if not previous_slots:
        return {
            "refresh_all": True,
            "refresh_flight": True,
            "refresh_hotel": True,
            "refresh_car": True,
            "refresh_attractions": True,
            "clear_hotel": False,
            "clear_car": False,
        }

    previous_view = extract_compare_fields(previous_slots)
    changed_fields = {k for k, v in current_view.items() if previous_view.get(k) != v}

    full_refresh_fields = {
        "destination_airport_code",
        "destination_city_code",
        "destination_city_name",
        "date_start",
        "date_end",
        "pax_adults",
        "pax_kids",
        "budget",
    }

    refresh_all = bool(changed_fields & full_refresh_fields)
    actions = {
        "refresh_all": refresh_all,
        "refresh_attractions": refresh_all,
        "clear_hotel": False,
        "clear_car": False,
    }

    if refresh_all:
        actions["refresh_flight"] = True
        actions["refresh_hotel"] = True
        actions["refresh_car"] = True
        return actions

    # Targeted refreshes
    actions["refresh_flight"] = "origin_airport_code" in changed_fields

    hotel_changed = bool({"hotel_request", "hotel_amenities", "hotel_rating"} & changed_fields)
    actions["refresh_hotel"] = hotel_changed and bool(current_view.get("hotel_request"))
    actions["clear_hotel"] = "hotel_request" in changed_fields and not current_view.get("hotel_request")

    car_changed = "car" in changed_fields
    actions["refresh_car"] = car_changed and bool(current_view.get("car"))
    actions["clear_car"] = car_changed and not current_view.get("car")

    attractions_changed = "attractions" in changed_fields
    actions["refresh_attractions"] = actions["refresh_attractions"] or attractions_changed

    return actions

# Persist the data to the backend
def _persist_to_backend(
    user_id: Optional[str],
    current_slots: Optional[Dict[str, Any]],
    returned_slots: Dict[str, Any],
    slot_id: str,
    message: str,
    ai_response: Dict[str, Any],
    is_complete_plan: bool
) -> None:
    try:
        if hasattr(current_slots, 'model_dump'):
            current_slots = current_slots.model_dump(mode='json', exclude_none=True)
        if hasattr(returned_slots, 'model_dump'):
            returned_slots = returned_slots.model_dump(mode='json', exclude_none=True)
        
        persist_payload = {
            "user_id": user_id,
            "current_slots": current_slots,
            "returned_slots": returned_slots,
            "slot_id": slot_id,
            "message": message,
            "ai_response": ai_response,
            "is_complete_plan": is_complete_plan
        }
        
        backend_url = f"{BACKEND_SERVICE_BASE_URL}/api/v1/ai/persist-chat"
        
        response = requests.post(
            backend_url,
            json=persist_payload,
            timeout=30.0,
            headers={"Content-Type": "application/json"}
        )
    
    except Exception:
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

    FE sends: { message, current_slots, user_id(optional) }
    BE returns: 
    - ParseResponse { slots, missing, reply } if information is missing
    - TravelOptionsResponse { plan_id, slot_id, flight, hotel, attractions, timestamps } if complete
    """
    # 1) Normalize current slots & guarantee slot_id
    current_slots = request.current_slots or Slots()  # Slots validator auto-assigns slot_id
                                                      # If FE sent slot_id:null, validator also assigns a new id
    if is_low_signal_message(request.message):
        print("⚠️ Low-signal message detected, skipping Gemini call.")
        missing = compute_missing_slots(current_slots)
        return ParseResponse(
            current_slots=current_slots,
            missing=missing,
            reply="I didn't catch that—let me know what you'd like to change."
        )
        
    # 2) LLM revise/fill and read parsed fields
    result = call_gemini(request.message, current_slots)
    try:
        pretty_result = json.dumps(result, indent=2, default=str)
    except Exception:
        pretty_result = str(result)
    print(f"=========\nAI result:\n{pretty_result}\n=========")
    slots_dict = result.get("current_slots", {})
    llm_missing = result.get("missing", [])
    reply = result.get("reply", " ")

    # Ensure reply is always a string, not a list
    if isinstance(reply, list):
        reply = " ".join(reply) if reply else " "

    # 3) Merge LLM slots into current slots
    try:
        new_current_slots = merge_slots_preserve_id(current_slots, slots_dict)
    except Exception as e:
        new_current_slots = current_slots
    
    # 4) Check if we have all the required information
    if "__llm_error__" in llm_missing:
        missing = ["__llm_error__"]
    else:
        missing = compute_missing_slots(new_current_slots)

    if not missing:
        print("\n✅ All slots filled, proceeding with search...")
    
        # To fix "Keep sending travel plan without users reqeust" issue
        # If the slot_id is same, send sample ParseResponse
        slot_snapshot = new_current_slots.model_dump(mode='json', exclude_none=False)
        slot_cache_key = new_current_slots.slot_id
        cached_plan = PLAN_CACHE.get(slot_cache_key)
        cached_slots = cached_plan["slots"] if cached_plan else None
        actions = detect_refresh_actions(cached_slots, new_current_slots)
        print(f"\n🔄 Refresh plan actions: {actions}")

        if cached_plan and cached_plan["slots"] == slot_snapshot and not any(actions.values()):
            return ParseResponse(
                current_slots=new_current_slots,
                missing=[],
                reply = reply
            )
        
        cached_response = cached_plan.get("response") if cached_plan else {}
        cached_flight = FlightOption(**cached_response["flight"]) if cached_response and cached_response.get("flight") else None
        cached_hotel = HotelOption(**cached_response["hotel"]) if cached_response and cached_response.get("hotel") else None
        cached_car = CarOption(**cached_response["car"]) if cached_response and cached_response.get("car") else None
        cached_attractions = [AttractionOption(**attr) for attr in cached_response.get("attractions", [])] if cached_response else []

        if actions["clear_hotel"]:
            cached_hotel = None
        if actions["clear_car"]:
            cached_car = None

        flight : Optional[FlightOption] = None if (actions["refresh_all"] or actions["refresh_flight"]) else cached_flight
        hotel : Optional[HotelOption] = None if (actions["refresh_all"] or actions["refresh_hotel"]) else cached_hotel
        car : Optional[CarOption] = None if (actions["refresh_all"] or actions["refresh_car"]) else cached_car
        attractions_list : List[AttractionOption] = [] if (actions["refresh_all"] or actions["refresh_attractions"]) else cached_attractions

        print("\n🆕 Plan creation Started...")
        plan_id = ulid.new().str
        created_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        updated_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # --- Flight Search ---
        can_search_flights = all ([
            new_current_slots.origin_airport_code,
            new_current_slots.destination_airport_code,
            new_current_slots.dates.start,
            new_current_slots.pax.adults is not None
        ])
        should_search_flights = actions["refresh_all"] or actions["refresh_flight"] or flight is None
        print(f"\n✅ CAN SEARCH FLIGHTS: {can_search_flights} | SHOULD SEARCH: {should_search_flights} ✅")
        flight_total_price = 0

        if should_search_flights and can_search_flights:
            try:
                print(f"✈️Searching flights: {new_current_slots.origin_airport_code} -> {new_current_slots.destination_airport_code}...")
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
                        print(f"✈️Selected flight: {flight.airline} - ${total_price:.2f}")
            except Exception as e:
                print(f"❌ ERROR: Flight search failed: {type(e).__name__}: {e}")
                import traceback
                traceback.print_exc()
        elif not should_search_flights and flight:
            pax_total = (new_current_slots.pax.adults or 0) + (new_current_slots.pax.kids or 0)
            flight_total_price = (flight.price_per_person or 0.0) * max(1, pax_total)
        else:
            print("\n✈️ Flight Search is SKIPPED.")

        # --- Hotel Search ---
        can_search_hotels = all([
            new_current_slots.hotel.request,    # if user didn't want a hotel, this will be false and hotel search will be skipped
            new_current_slots.destination_city_code,    
            new_current_slots.dates.start, new_current_slots.dates.end,
            new_current_slots.pax.adults is not None
        ])
        should_search_hotels = (actions["refresh_all"] or actions["refresh_hotel"] or (hotel is None and new_current_slots.hotel.request is True)) and not actions["clear_hotel"]
        print(f"\n✅ CAN SEARCH HOTELS: {can_search_hotels} | SHOULD SEARCH: {should_search_hotels} ✅")
        hotel_total_price = hotel.total_price if hotel else 0

        if should_search_hotels and can_search_hotels:
            try:
                print(f"🏨Searching hotels for: {new_current_slots.destination_city_code}...")
                hotel_results = amadeus_search_hotels(new_current_slots)
                print(f"Hotel search returned {len(hotel_results) if hotel_results else 0} results")
                if hotel_results:
                    target_hotel_budget = (new_current_slots.budget or 0) * 0.30
                    selected_hotel = pick_near_target(hotel_results, 'total_price', target_hotel_budget)
                    if selected_hotel:
                        hotel = HotelOption(**selected_hotel)
                        hotel_total_price = hotel.total_price
                        print(f"\n🏨 Selected hotel: {hotel.name} - ${hotel_total_price:.2f}")
            except Exception as e:
                print(f"❌ ERROR: Hotel search failed: {type(e).__name__}: {e}")
                import traceback
                traceback.print_exc()
        elif actions["clear_hotel"]:
            hotel = None
            hotel_total_price = 0
            print("\n🏨 Hotel removed per user request.")
        elif not should_search_hotels and hotel:
            hotel_total_price = hotel.total_price
        else:
            print("\n🏨 Hotel Search is SKIPPED.")

        # --- Attraction Search ---
        can_search_attractions = new_current_slots.destination_city_code is not None
        should_search_attractions = actions["refresh_all"] or actions["refresh_attractions"] or (not attractions_list and can_search_attractions)
        print(f"\n✅ CAN SEARCH ATTRACTIONS: {can_search_attractions} | SHOULD SEARCH: {should_search_attractions} ✅")
        attraction_total_price = 0

        if should_search_attractions and can_search_attractions:
            try:
                attraction_results = amadeus_search_attractions(new_current_slots)
                print(f"🎢 Attraction search returned {len(attraction_results) if attraction_results else 0} results")
                if attraction_results:
                    attractions_list = [AttractionOption(**attr) for attr in attraction_results]
            except Exception as e:
                print(f"❌ ERROR: Attraction search failed: {type(e).__name__}: {e}")
                import traceback
                traceback.print_exc()
            else:
                print(f"🎢 No attractions found")  
        else:
            print("\n🎢 Attrations Search is SKIPPED.")

        # Calculate and normalize attraction prices
        if attractions_list:
            attraction_total_price = sum(attr.price for attr in attractions_list)
        else:
            attraction_total_price = 0
        
        # --- Car Search ---
        can_search_car = new_current_slots.car is True
        should_search_car = (actions["refresh_all"] or actions["refresh_car"] or (car is None and can_search_car)) and not actions["clear_car"]
        print(f"\n✅ CAN SEARCH CAR: {can_search_car} | SHOULD SEARCH: {should_search_car} ✅")
        car_total_price = 0

        if should_search_car and can_search_car:
            print("🚗 Searching for car...")
            car = car_search_mock(new_current_slots, CARS_DATA)
            if car:
                # Calculate days of using car based on the start and end information from slot  
                print(f"\n🚗 Found {car} car.")
                start_date = datetime.strptime(new_current_slots.dates.start, "%Y-%m-%d").date()
                end_date = datetime.strptime(new_current_slots.dates.end, "%Y-%m-%d").date()
                car_days = (end_date - start_date).days
                car_total_price = car.price_per_day * car_days
                print(f"\n🚗 Car rental for {car_days} days at {car.price_per_day}/day = ${car_total_price}\n")
            else:
                print("\n🚗 No car found")
        elif actions["clear_car"]:
            car = None
            car_total_price = 0
            print("\n🚗 Car removed per user request.")
        elif not should_search_car and car and new_current_slots.dates.start and new_current_slots.dates.end:
            start_date = datetime.strptime(new_current_slots.dates.start, "%Y-%m-%d").date()
            end_date = datetime.strptime(new_current_slots.dates.end, "%Y-%m-%d").date()
            car_days = (end_date - start_date).days
            car_total_price = car.price_per_day * car_days
        else:
            print("\n🚗 Car Search is SKIPPED.")
        
        total_price = flight_total_price + hotel_total_price + car_total_price + attraction_total_price
        print(f"\n💰 The total price for the travel plan is: ${total_price:.2f}\n")

        # Negative = under budget | Positive = over budget
        price_different:float = total_price - (new_current_slots.budget or 0)

        if price_different < 0.0: # Under budget
            reply = f"Here is your travel plan. Your trip total is under your budget!"
            # reply = f"Your trip total is ${total_price:.2f} — that's under your ${new_current_slots.budget:.2f} budget."
        elif price_different == 0.0:
            reply = f"Here is your travel plan. Your trip total is same as your budget!"
            # reply = f"Your trip total is ${total_price:.2f} — that matches your ${new_current_slots.budget:.2f} budget."
        elif 0.0 < price_different <= 200.00:   # Over budget less than $200
            reply = f"Here is your travel plan. Your trip total is just a bit over your budget!"
            # reply = f"Looks like the total comes to ${total_price:.2f}, which is just a bit over your ${new_current_slots.budget:.2f} budget, but it will be awesome!"
        elif 200.00 < price_different:      # Over budget more than $200
            reply = f"Here is your travel plan. Your trip total is quite a bit above your budget!"
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
            # "current_slots": new_current_slots.model_dump(mode='json', exclude_none=True),
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
            current_slots = new_current_slots,
            flight = flight,
            hotel = hotel,
            car = car,
            attractions = attractions_list,
            created_time = created_time,
            updated_time = updated_time,
            reply = reply
        )

        # Cache slots + response for this slot_id to avoid duplicate plan generation
        PLAN_CACHE[final_slot_id] = {
            "slots": slot_snapshot,
            "response": response.model_dump(mode='json')
        }

        try:
            _persist_to_backend(
                user_id=request.user_id,
                current_slots=request.current_slots,
                returned_slots=new_current_slots.model_dump(mode='json', exclude_none=True),
                slot_id=final_slot_id,
                message=request.message,
                ai_response=ai_response_data,
                is_complete_plan=True
            )
        except Exception:
            pass
        
        return response
    else:
        # Information is missing - return ParseResponse to ask for clarification
        response = ParseResponse(current_slots=new_current_slots, missing=missing, reply=reply)
        
        try:
            _persist_to_backend(
                user_id=request.user_id,
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
            pass
        
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
