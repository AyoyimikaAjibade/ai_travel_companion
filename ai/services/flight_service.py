#-----------------------------------------------------
# API - Service for flight -- 35% of budget
#-----------------------------------------------------
from typing import Any, Dict, List
import requests
from base_models import Slots
from .amadeus_client import get_amadeus_access_token
from .config import AMADEUS_URL
from .utils import convert_currency_to_usd

def amadeus_search_flights(slots: Slots) -> List[Dict[str, Any]]:
    if not all([slots.origin_airport_code, slots.destination_airport_code, slots.dates.start, slots.pax.adults]):
        print("Missing essential flight search information for Amadeus.")
        return []

    token = get_amadeus_access_token()
    if not token:
        print("Access Token is not valid")
        return []

    url = f"{AMADEUS_URL}/v2/shopping/flight-offers"
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "originLocationCode": slots.origin_airport_code,
        "destinationLocationCode": slots.destination_airport_code,
        "departureDate": slots.dates.start,
        "adults": slots.pax.adults,
        "children": slots.pax.kids,
        "currencyCode": "USD",
        "nonStop": "false",
        "max": 30
    }
    if slots.dates.end:
        params["returnDate"] = slots.dates.end

    try:
        r = requests.get(url, headers=headers, params=params, timeout=30)
        r.raise_for_status()
        offers = r.json()
        parsed = []
        for offer in offers.get('data', []):
            it = offer.get('itineraries', [{}])[0]
            first_seg = it.get('segments', [{}])[0]
            raw_total = float((offer.get('price', {}) or {}).get('total', 0) or 0)
            raw_cur = (offer.get('price', {}) or {}).get('currency', 'USD')
            usd = convert_currency_to_usd(raw_total, raw_cur)
            parsed.append({
                "airline": first_seg.get('carrierCode', 'N/A'),
                "price_per_person": usd,
                "currency": 'USD',
                "departure_time": first_seg.get('departure', {}).get('at', 'N/A'),
                "arrival_time": it.get('segments', [{}])[-1].get('arrival', {}).get('at', 'N/A'),
                "link": "https://www.amadeus.com"
            })
        
        """
        # For debugging
        for flight in parsed:
            if flight:
                print(flight)
            else:
                print("No parsed flight")
        """
        
        return parsed
    except requests.RequestException as e:
        print(f"Amadeus Flight Offers error: {e}")
        return []
