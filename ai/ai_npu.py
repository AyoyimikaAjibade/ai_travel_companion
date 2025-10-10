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
from api_services import (
    call_gemini, 
    amadeus_search_flights,
    amadeus_search_hotels,
    amadeus_search_attractions    )
from base_models import (
    ChatRequest,ParseResponse, ClarifyRequest, ClarifyResponse,
    TravelOptionsResponse,Slots,FlightOption,HotelOption,
    CarOption, AttractionOption, Slots
)
import os
import requests

load_dotenv()

app = FastAPI (
        title = "TWOS AI NLP Testing",
        description="AI-powered Travel planner",
        version="1.0.0"
    )

# ------------------------------
# Functions for endpoints
# ------------------------------

def _strip_nones(x):
    if isinstance(x, dict):
        return {k: _strip_nones(v) for k, v in x.items() if v is not None}
    if isinstance(x, list):
        return [_strip_nones(v) for v in x]
    return x

def merge_slots_preserve_id(existing: Slots, incoming: Dict[str, Any]) -> Slots:
    """
    Merge LLM-parsed fields into existing Slots while preserving slot_id.
    Rebuilds a *validated* Slots so nested models (Dates/Pax/HotelPreferences) are correct.
    """
    cleaned = _strip_nones(incoming or {})
    cleaned.pop("slot_id", None)  # never accept client/LLM id

    merged_dict = existing.model_dump()      # to plain dict
    merged_dict.update(cleaned)              # apply updates
    merged_dict["slot_id"] = existing.slot_id

    # IMPORTANT: rebuild Slots to validate/construct submodels
    return Slots.model_validate(merged_dict)

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

# Parse the user's request (natural language text)
@app.post("/chat", response_model = ParseResponse)
def chat(request: ChatRequest):
    """
    Parses the user's natural language message to fill or update travel slots.
    - For initial requests, just provide the 'message'.
    - For revisions, provide the new 'message' and the 'current_slots' from the existing plan.

    FE sends: { message, current_slots }
    BE returns: { slots, missing }
    - Generate slot_id on first request
    - Preserve slot_id across all revisions
    """
    # The call_gemini function should be adapted to handle current_slots for context
    # For example, the prompt could be:
    # "Given the existing travel plan {current_slots}, update it based on the following message: {message}"

    # 1) Normalize current slots & guarantee slot_id
    current_slots = request.current_slots or Slots()  # Slots validator auto-assigns slot_id
    # (If FE sent slot_id:null, validator also assigns a new id)

    # 2) LLM revise/fill and read parsed fields
    result = call_gemini(request.message, current_slots)

    slots_dict = result.get("current_slots", {})
    missing = result.get("missing", [])
    # confidence = result.get("confidence", {})

    # If missing is exist, then return current slots and missing. Otherwise, call APIs
    # 3) Merge LLM slots into current slots, but preserve slot_id
    try:
        new_current_slots = merge_slots_preserve_id(current_slots, slots_dict)
    except Exception as e:
        print("SLOTS PARSE ERROR", repr(e), "payload", slots_dict)
        new_current_slots = current_slots

    return ParseResponse(current_slots=new_current_slots, missing=missing)
    # return ParseResponse(current_slots=new_current_slots, missing=missing, confidence=confidence)
    # return ParseMissing(missing=missing)

@app.post("/clarify", response_model=ClarifyResponse)
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

# This endpoint now finds the CHEAPEST options and returns a single plan
@app.post("/search_for_dev", response_model=TravelOptionsResponse)
def search_options_for_dev(slots:Slots):
    print("Received slots for search: ", slots.model_dump())

    flight_results = amadeus_search_flights(slots)
    hotel_results = amadeus_search_hotels(slots)

    return TravelOptionsResponse(
        flights=[FlightOption(**flight) for flight in flight_results],
        hotels=[HotelOption(**hotel) for hotel in hotel_results],
    )

# Handle parse and search options at once.
# 1. Parse the user's natural language input
# 2. Use ONLY "slots" data in the parsed data
# 3. send API calls

# This endpoint now finds the CHEAPEST options and returns a single plan
@app.post("/search", response_model=TravelOptionsResponse)
def search_options(slots:Slots):
    """
    Receives a complete set of slots and returns a single, optimized travel plan.
    Currently optimized for the CHEAPEST options.
    """

    print("✅ Received slots for search: ", slots.model_dump_json(indent=2))

    cheapest_flight : Optional[FlightOption] = None
    cheapest_hotel : Optional[HotelOption] = None
    car : Optional[CarOption] = None
    attractions_list : List[AttractionOption] = []

    # --- Flight Search ---
    can_search_flights = all ([
        slots.origin_airport_code,
        slots.destination_airport_code,
        slots.dates.start,
        slots.pax.adults is not None
    ])
    print(f"✅ CAN SEARCH FLIGHTS: {can_search_flights} ✅")

    if can_search_flights:
        print("🛩️ Searching for flights...")
        try:
            flight_results = amadeus_search_flights(slots)
            if flight_results:
                cheapest = min(flight_results,key=lambda x: x.get('price', float('inf')))
                cheapest_flight = FlightOption(**cheapest)
                print(f"\n✈️ Found cheapest flight: {cheapest_flight.airline} for ${cheapest_flight.price}")
        except Exception as e:
            print("🔴 Flight search failed 🔴: ", repr(e))

    # --- Hotel Search ---
    can_search_hotels = all([
        slots.hotel.request,    # if user didn't want a hotel, this will be false and hotel search will be skipped
        slots.destination_city_code,    
        slots.dates.start, slots.dates.end,
        slots.pax.adults is not None
    ])
    
    if can_search_hotels:
        print(f"\n✅ CAN SEARCH HOTELS: {can_search_hotels} ✅")
        print("🏨 Searching for hotels...")

        try:
            hotel_results = amadeus_search_hotels(slots)
            if hotel_results:
                cheapest = hotel_results[0]
                #cheapest = min(hotel_results, key=lambda x: x.get('price_per_night', float('inf')))
                cheapest_hotel = HotelOption(**cheapest)
                print(f"\n🏨 Found cheapest hotel: {cheapest_hotel.name} and total price is ${cheapest_hotel.total_price}\n")
        except Exception as e:
            print("🔴 Hotel search failed 🔴: ", repr(e))
    else:
        print(f"✅ HOTEL SEARCH IS SKIPPED ✅")

    # --- Attraction Search ---
    can_search_attractions = slots.destination_city_code is not None
    print(f"✅ CAN SEARCH ATTRACTIONS: {can_search_attractions} ✅")

    if can_search_attractions:
        print("🎭 Searching for attractions...")
        attraction_results = amadeus_search_attractions(slots)
        if attraction_results:
            attractions_list = [AttractionOption(**attr) for attr in attraction_results]
            print(f"🎭 Found {len(attractions_list)} attractions.")


    # --- Car Search ---

    return TravelOptionsResponse(
        flight = cheapest_flight,
        hotel = cheapest_hotel,
        # cars
        attractions = attractions_list
    )
"""
@app.post("/preference/update")
def preference_update(request: PreferenceUpdate): 
"""