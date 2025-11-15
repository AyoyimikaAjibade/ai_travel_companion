import math, requests
from typing import Any, Dict, List, Optional
from datetime import datetime
from base_models import Slots
from .amadeus_client import get_amadeus_access_token
from .config import AMADEUS_URL
from .utils import convert_currency_to_usd, chunked, pick

AMENITY_MAP: Dict[str, str] = {
    "wifi":"WIFI","wi-fi":"WIFI","pool":"SWIMMING_POOL","parking":"PARKING","restaurant":"RESTAURANT",
    "gym":"FITNESS_CENTER","spa":"SAUNA","pets":"PETS_ALLOWED","ev_charger":"ELECTRIC_CAR_CHARGING_STATION",
}
MEAL_MAP: Dict[str, str] = {
    "breakfast":"BREAKFAST","room_only":"ROOM_ONLY","half_board":"HALF_BOARD",
    "full_board":"FULL_BOARD","all_inclusive":"ALL_INCLUSIVE",
}

def _map_hotel_amenities(user_amenities: Optional[List[str]]) -> Optional[str]:
    if not user_amenities: return None
    enums = []
    for a in user_amenities:
        if not a: continue
        enums.append(AMENITY_MAP.get(a.strip().lower(), a.strip().upper()))
    return ",".join(sorted(set(enums))) if enums else None

def _map_meals(user_meals: Optional[List[str]]) -> Optional[str]:
    if not user_meals: return None
    enums = []
    for m in user_meals:
        if not m: continue
        enums.append(MEAL_MAP.get(m.strip().lower(), m.strip().upper()))
    return ",".join(sorted(set(enums))) if enums else None

def amadeus_get_hotel_ids(city_code: str, access_token: str, limit: int = 60,
                          min_rating: Optional[int] = None,
                          amenities: Optional[List[str]] = None) -> List[str]:
    RADIUS = 5
    
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
    url_city = f"{AMADEUS_URL}/v1/reference-data/locations/hotels/by-city"
    params_city = {"cityCode": city_code}
    
    if min_rating:
        params_city["ratings"] = ",".join(str(r) for r in range(min_rating, 6) if r <= 5)
    mapped = _map_hotel_amenities(amenities)
    
    if mapped:
        params_city["amenities"] = mapped
        params_city["radius"] = RADIUS
        params_city["radiusUnit"] = "KM"

    resp = requests.get(url_city, headers=headers, params=params_city, timeout=30)
    if resp.ok:
        resp.raise_for_status()
        data = resp.json()
        ids: List[str] = []
        for item in data.get("data", []):
            hid = item.get("hotelId")
            if hid:
                ids.append(hid)
                if len(ids) >= limit: break
        return ids

    # Fallback by geocode
    url_loc = f"{AMADEUS_URL}/v1/reference-data/locations"
    
    loc = requests.get(url_loc, headers=headers, params={"keyword": city_code, "subType": "CITY", "page[limit]": 1}, timeout=30)
    loc.raise_for_status()
    items = loc.json().get("data", [])
    
    if not items: 
        return []
    
    geo = items[0].get("geoCode") or {}
    lat, lon = geo.get("latitude"), geo.get("longitude")
    
    if lat is None or lon is None: 
        return []
    
    url_geo = f"{AMADEUS_URL}/v1/reference-data/locations/hotels/by-geocode"
    params_geo = {"latitude": str(lat), "longitude": str(lon), "radius": RADIUS, "radiusUnit": "KM"}
    
    if min_rating:
        params_geo["ratings"] = ",".join(str(r) for r in range(min_rating, 6) if r <= 5)
    if mapped:
        params_geo["amenities"] = mapped
    
    geo_resp = requests.get(url_geo, headers=headers, params=params_geo, timeout=30)
    geo_resp.raise_for_status()
    ids: List[str] = []
    
    for item in geo_resp.json().get("data", []):
        hid = item.get("hotelId")
        if hid:
            ids.append(hid)
            if len(ids) >= limit: break
    return ids

def amadeus_search_hotels(slots: Slots) -> List[Dict[str, Any]]:
    MAX_IDS = 20
    
    if not all([slots.destination_city_code, slots.dates.start, slots.dates.end, slots.pax.adults]):
        print("Missing essential hotel search information for Amadeus.")
        return []

    access_token = get_amadeus_access_token()
    hotel_pref = getattr(slots, "hotel", None)
    min_rating = pick(hotel_pref, "rating", None)
    wanted_amenities = (pick(hotel_pref, "amenities", []) or [])
    check_in = datetime.strptime(slots.dates.start, "%Y-%m-%d")
    check_out = datetime.strptime(slots.dates.end, "%Y-%m-%d")
    nights = (check_out - check_in).days

    room_meals, hotel_level_amenities = [], []
    for a in wanted_amenities:
        if a and a.strip().lower() in ("breakfast","room_only","half_board","full_board","all_inclusive"):
            room_meals.append(a)
        else:
            hotel_level_amenities.append(a)
    meals_param = _map_meals(room_meals)

    ids = amadeus_get_hotel_ids(slots.destination_city_code, access_token, limit=60,
                                min_rating=min_rating, amenities=hotel_level_amenities)
    if not ids:
        return []

    url = f"{AMADEUS_URL}/v3/shopping/hotel-offers"
    headers = {"Authorization": f"Bearer {access_token}"}

    total_people = (slots.pax.adults + slots.pax.kids)
    room_qty = max(1, math.ceil(total_people / 2))

    candidates: List[Dict[str, Any]] = []
    for batch in chunked(ids, MAX_IDS):
        params = {
            "hotelIds": ",".join(batch),
            "checkInDate": slots.dates.start,
            "checkOutDate": slots.dates.end,
            "adults": slots.pax.adults,
            "roomQuantity": room_qty,
            "bestRateOnly": "true",
            "currency": "USD",
        }
        if meals_param:
            params["meals"] = meals_param

        try:
            r = requests.get(url, headers=headers, params=params, timeout=30)
            if not r.ok:
                # Skip batches with invalid IDs and keep going
                if r.status_code == 400:
                    print(f"[Amadeus Hotels] 400: {r.text[:200]}")
                    continue
                r.raise_for_status()
            data = r.json()
        except requests.RequestException as e:
            print(f"[Amadeus Hotels] batch error: {e}")
            continue

        for ho in data.get('data', []):
            hotel = ho.get('hotel', {}) or {}
            for offer in ho.get('offers', []) or []:
                board = offer.get("boardType") or (offer.get("mealPlan", {}) or {}).get("type")
                if meals_param and board and "BREAKFAST" not in board.upper():
                    continue
                raw_total = (offer.get("price", {}) or {}).get("total")
                try:
                    total_raw = float(raw_total) if raw_total is not None else None
                except Exception:
                    total_raw = None
                if total_raw is None:
                    continue
                raw_cur = (offer.get("price", {}) or {}).get("currency", "USD")
                total_usd = convert_currency_to_usd(total_raw, raw_cur)
                price_per_night = total_usd / nights

                candidates.append({
                    "hotel_id": hotel.get("hotelId"),
                    "name": hotel.get("name", "N/A"),
                    "rating": min_rating,
                    "total_price": total_usd,
                    "price_per_night": price_per_night,
                    "currency": "USD",
                    "board": board,
                    "offer_id": offer.get("id"),
                    "link": "https://www.amadeus.com",
                })

    #For debugging
    if candidates:
        for candidate in candidates:
            print(candidate)
    else:
        print(f"\nNo candidate hotels!\n")

    return sorted(candidates, key=lambda x: x.get('total_price', float('inf')))
