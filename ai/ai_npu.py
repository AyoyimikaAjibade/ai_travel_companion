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
    CarOption, AttractionOption, Slots, ChatResponse
)
import os
import requests
import ulid
from datetime import datetime

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
        
        cheapest_flight : Optional[FlightOption] = None
        cheapest_hotel : Optional[HotelOption] = None
        car : Optional[CarOption] = None
        attractions_list : List[AttractionOption] = []

        # --- Flight Search ---
        can_search_flights = all ([
            new_current_slots.origin_airport_code,
            new_current_slots.destination_airport_code,
            new_current_slots.dates.start,
            new_current_slots.pax.adults is not None
        ])
        print(f"\n✅ CAN SEARCH FLIGHTS: {can_search_flights} ✅")

        if can_search_flights:
            print("🛩️ Searching for flights...")
            try:
                flight_results = amadeus_search_flights(new_current_slots)
                if flight_results:
                    cheapest = min(flight_results,key=lambda x: x.get('price', float('inf')))
                    cheapest_flight = FlightOption(**cheapest)
                    print(f"\n✈️ Found cheapest flight: {cheapest_flight.airline} for ${cheapest_flight.price}")
            except Exception as e:
                print("🔴 Flight search failed 🔴: ", repr(e))

        # --- Hotel Search ---
        can_search_hotels = all([
            new_current_slots.hotel.request,    # if user didn't want a hotel, this will be false and hotel search will be skipped
            new_current_slots.destination_city_code,    
            new_current_slots.dates.start, new_current_slots.dates.end,
            new_current_slots.pax.adults is not None
        ])
        
        if can_search_hotels:
            print(f"\n✅ CAN SEARCH HOTELS: {can_search_hotels} ✅")
            print("🏨 Searching for hotels...")

            try:
                hotel_results = amadeus_search_hotels(new_current_slots)
                if hotel_results:
                    cheapest = hotel_results[0]
                    cheapest_hotel = HotelOption(**cheapest)
                    print(f"\n🏨 Found cheapest hotel: {cheapest_hotel.name} and flat price is {cheapest_hotel.price_per_night}{cheapest_hotel.currency}\n")
            except Exception as e:
                print("🔴 Hotel search failed 🔴: ", repr(e))
        else:
            print(f"\n✅ HOTEL SEARCH IS SKIPPED ✅")

        # --- Attraction Search ---
        can_search_attractions = new_current_slots.destination_city_code is not None
        print(f"\n✅ CAN SEARCH ATTRACTIONS: {can_search_attractions} ✅")

        if can_search_attractions:
            print("🎭 Searching for attractions...")
            attraction_results = amadeus_search_attractions(new_current_slots)
            if attraction_results:
                attractions_list = [AttractionOption(**attr) for attr in attraction_results]
                print(f"\n🎭 Found {len(attractions_list)} attractions.")

        # Return TravelOptionsResponse with search results
        return TravelOptionsResponse(
            plan_id = plan_id,
            slot_id = new_current_slots.slot_id,
            flight = cheapest_flight,
            hotel = cheapest_hotel,
            attractions = attractions_list,
            created_time = created_time,
            updated_time = updated_time,
            reply = reply
        )
    else:
        # Information is missing - return ParseResponse to ask for clarification
        print(f"❌ Missing information: {missing}")
        return ParseResponse(current_slots=new_current_slots, missing=missing, reply=reply)

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

    # Generate plan_id when the plan is generated
    plan_id = ulid.new().str

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

    # Generate plan_id when the plan is generated
    plan_id = ulid.new().str
    created_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    updated_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
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
                # print(f"\n🏨 Found cheapest hotel: {cheapest_hotel.name} and total price is ${cheapest_hotel.total_price}\n")
                print(f"\n🏨 Found cheapest hotel: {cheapest_hotel.name} and flat price is {cheapest_hotel.price_per_night}{cheapest_hotel.currency}\n")
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
        plan_id = plan_id,
        slot_id = slots.slot_id,
        flight = cheapest_flight,
        hotel = cheapest_hotel,
        # cars
        attractions = attractions_list,
        created_time = created_time,
        updated_time = updated_time
    )
"""
@app.post("/preference/update")
def preference_update(request: PreferenceUpdate): 
"""