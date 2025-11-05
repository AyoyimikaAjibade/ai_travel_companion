from typing import Any, Dict, List
from base_models import CarOption, Pax, Slots

def infer_car_types_by_pax(pax: Pax) -> List[str]:
    adults = pax.adults or 0
    kids = pax.kids or 0
    total = adults + kids
    
    if total <= 2:
        return ["Sedan - Compact", "Sedan - Standard", "SUV - Compact"]
    if total in (3, 4):
        return ["SUV - Standard", "SUV - Compact", "Sedan - Standard"]
    if total >= 5:
        return ["Minivan", "SUV - Full", "SUV - Standard"]
    
    return ["Sedan - Standard", "SUV - Compact"]

def car_search_mock(slots: Slots, cars_json: Dict[str, Any]) -> CarOption:
    options = [CarOption(**c) for c in cars_json.get("rental_cars", [])]
    
    if not options:
        raise ValueError("No car options available.")
    
    preferred = infer_car_types_by_pax(slots.pax)
    
    for ct in preferred:
        matches = [o for o in options if o.car_type.lower() == ct.lower()]
        if matches:
            return sorted(matches, key=lambda o: o.price_per_day)[0]
    
    return sorted(options, key=lambda o: o.price_per_day)[0]
