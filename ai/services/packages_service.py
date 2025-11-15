from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import random
import ulid

from base_models import (
    Slots,
    Pax,
    FlightOption,
    HotelOption,
    CarOption,
    AttractionOption,
    TravelOptionsResponse,
)

from .flight_service import amadeus_search_flights
from .hotel_service import amadeus_search_hotels
from .attractions_service import amadeus_search_attractions
from .rental_car_service import car_search_mock
from .utils import pick_near_target

# ------------------------------------------------------------------------
# Build example slots for three budget tiers
#   - under_2000: 2–3 nights, domestic short
#   - between_2000_5000: 3–6 nights, domestic long-haul
#   - above_5000: 5–10 nights, intl
# ------------------------------------------------------------------------
def _build_slots_for_budget(tier: str) -> Slots:
    today = datetime.utcnow().date()
    depart_offset = random.randint(3, 5)  # 3–5 days from now

    # nights per tier
    if tier == "under_2000":
        nights = random.randint(2, 3)
    elif tier == "between_2000_5000":
        nights = random.randint(3, 6)
    else:
        nights = random.randint(5, 10)

    origin_airport = "SFO"

    nearby_us = [
        ("Los Angeles", "LAX", "LAX"),
        ("Las Vegas", "LAS", "LAS"),
        ("Seattle", "SEA", "SEA"),
        ("San Diego", "SAN", "SAN"),
        ("Portland", "PDX", "PDX"),
    ]

    domestic_longhaul = [
        ("New York", "NYC", "JFK"),
        ("Washington D.C.", "WAS", "IAD"),
        ("Chicago", "CHI", "ORD"),
        ("Miami", "MIA", "MIA"),
        ("Boston", "BOS", "BOS"),
        ("Dallas", "DFW", "DFW"),
        ("Atlanta", "ATL", "ATL"),
    ]

    international = [
        ("London", "LON", "LHR"),
        ("Paris", "PAR", "CDG"),
        ("Tokyo", "TYO", "HND"),
        ("Seoul", "SEL", "ICN"),
        ("Toronto", "YTO", "YYZ"),
        ("Mexico City", "MEX", "MEX"),
        ("Vancouver", "YVR", "YVR"),
        ("Honolulu", "HNL", "HNL"),
    ]

    if tier == "under_2000":
        pool = nearby_us
    elif tier == "between_2000_5000":
        pool = domestic_longhaul
    else:
        pool = international

    dest_name, dest_city_code, dest_airport = random.choice(pool)

    # heuristic budgets + prefs
    if tier == "under_2000":
        budget_value = random.randint(1200, 1800)
        hotel_rating = 3
        wants_car = False
        amenities = ["wifi"]
    elif tier == "between_2000_5000":
        budget_value = random.randint(2200, 4800)
        hotel_rating = 4
        wants_car = random.choice([False, True])
        amenities = ["wifi", "breakfast"]
    else:
        budget_value = random.randint(5200, 9000)
        hotel_rating = 5
        wants_car = random.choice([False, True])
        amenities = ["wifi", "breakfast", "gym", "pool"]

    start_date = today + timedelta(days=depart_offset)
    end_date = start_date + timedelta(days=nights)

    return Slots(
        origin_airport_code=origin_airport,
        destination_airport_code=dest_airport,
        destination_city_name=dest_name,
        destination_city_code=dest_city_code,
        dates={"start": start_date.strftime("%Y-%m-%d"), "end": end_date.strftime("%Y-%m-%d")},
        pax={"adults": random.choice([1, 2]), "kids": random.choice([0, 1])},
        budget=float(budget_value),
        hotel={"request": True, "amenities": amenities, "rating": hotel_rating},
        car=wants_car,
        attractions=[],
    )


# ------------------------------------------------------------------------
# Build a full plan (flight/hotel/car/attractions) from Slots
# ------------------------------------------------------------------------
def _build_plan_from_slots(slots: Slots, cars_data: Dict[str, Any]) -> TravelOptionsResponse:
    plan_id = ulid.new().str
    created_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    updated_time = created_time

    flight_opt: Optional[FlightOption] = None
    hotel_opt: Optional[HotelOption] = None
    car_opt: Optional[CarOption] = None
    attractions_opts: List[AttractionOption] = []

    # Flights
    try:
        flights = amadeus_search_flights(slots)
        if flights:
            target_total = (slots.budget or 0) * 0.35
            pax_total = (slots.pax.adults or 0) + (slots.pax.kids or 0)
            per_person_target = (target_total / pax_total) if pax_total else target_total
            selected = pick_near_target(flights, "price", per_person_target)
            if selected:
                total_price = selected.get("price", 0.0) * max(1, pax_total)
                selected_total = dict(selected)
                selected_total["price"] = total_price
                flight_opt = FlightOption(**selected_total)
    except Exception as e:
        print("packages: flight search error", repr(e))

    print(f"\nPACKAGES: The selected option: {flight_opt}\n")

    # Hotels
    try:
        hotels = amadeus_search_hotels(slots)
        if hotels:
            target_hotel_budget = (slots.budget or 0) * 0.30
            selected_hotel = pick_near_target(hotels, "total_price", target_hotel_budget)
            if selected_hotel:
                hotel_opt = HotelOption(**selected_hotel)
    except Exception as e:
        print("packages: hotel search error", repr(e))

    print(f"PACKAGES: The selected option: {hotel_opt}\n")

    # Attractions
    try:
        attrs = amadeus_search_attractions(slots)
        if attrs:
            attractions_opts = [AttractionOption(**a) for a in attrs]
    except Exception as e:
        print("packages: attractions search error", repr(e))
    
    print(f"\nPACKAGES: The selected option: {attractions_opts}\n")

    # Car
    try:
        if slots.car is not None:
            car_opt = car_search_mock(slots, cars_data)
    except Exception as e:
        print("packages: car search error", repr(e))
    
    print(f"\nPACKAGES: The selected option: {car_opt}\n")

    # Price tally
    total_price = 0.0
    if flight_opt:
        total_price += getattr(flight_opt, "price", 0.0)
    if hotel_opt:
        total_price += getattr(hotel_opt, "total_price", 0.0)
    if car_opt:
        try:
            start_date = getattr(slots.dates, "start", None)
            end_date = getattr(slots.dates, "end", None)
            if start_date and end_date:
                from datetime import datetime as dt
                nights = (dt.strptime(end_date, "%Y-%m-%d") - dt.strptime(start_date, "%Y-%m-%d")).days
                car_days = max(1, nights)
            else:
                car_days = 1
        except Exception:
            car_days = 1
        total_price += getattr(car_opt, "price_per_day", 0.0) * car_days
    if attractions_opts:
        total_price += sum([getattr(a, "price", 0.0) for a in attractions_opts])

    # Reply vs budget
    budget = slots.budget or 0.0
    reply = ""
    if total_price > 0 and budget > 0:
        gap = total_price - budget
        if gap > 0:
            reply = f"Total estimated trip cost is ${total_price:.2f}, which is ${gap:.2f} over your budget of ${budget:.0f}."
        else:
            reply = f"Total estimated trip cost is ${total_price:.2f}, which is ${-gap:.2f} under your budget of ${budget:.0f}."

    return TravelOptionsResponse(
        plan_id=plan_id,
        slot_id=slots.slot_id,
        flight=flight_opt,
        hotel=hotel_opt,
        car=car_opt,
        attractions=attractions_opts,
        created_time=created_time,
        updated_time=updated_time,
        reply=reply,
    )


# ------------------------------------------------------------------------
# Public: build 3 packages by tier in one call
#   returns: {"under_2000": TravelOptionsResponse, ...}
# ------------------------------------------------------------------------
def build_three_budget_packages(cars_data: Dict[str, Any]) -> Dict[str, TravelOptionsResponse]:
    tiers = ["under_2000", "between_2000_5000", "above_5000"]
    plans: Dict[str, TravelOptionsResponse] = {}
    for tier in tiers:
        slots = _build_slots_for_budget(tier)
        plan = _build_plan_from_slots(slots, cars_data)
        plans[tier] = plan
    return plans
