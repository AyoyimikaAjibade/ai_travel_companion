from typing import Any, Dict, List, Optional, Tuple
from base_models import Slots
import requests
from .amadeus_client import get_amadeus_access_token
from .config import AMADEUS_URL
from .utils import convert_currency_to_usd

def _get_city_lat_lon(city_name: str, token: str) -> Optional[Tuple[float, float]]:
    url = f"{AMADEUS_URL}/v1/reference-data/locations/cities"
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        res = requests.get(url, headers=headers, params={"keyword": city_name}, timeout=10)
        res.raise_for_status()
        data = res.json().get("data", [])
        
        if not data: 
            return None
        
        geo = data[0].get("geoCode", {})
        lat, lon = geo.get("latitude"), geo.get("longitude")
        
        if lat is not None and lon is not None:
            return float(lat), float(lon)
    
    except requests.RequestException:
        pass
    
    # Fallback
    url2 = f"{AMADEUS_URL}/v1/reference-data/locations"
    
    try:
        res2 = requests.get(url2, headers=headers, params={"keyword": city_name, "subType": "CITY", "page[limit]": 1}, timeout=10)
        res2.raise_for_status()
        items = res2.json().get("data", [])
        if not items: return None
        geo = items[0].get("geoCode", {})
        lat, lon = geo.get("latitude"), geo.get("longitude")
        if lat is not None and lon is not None:
            return float(lat), float(lon)
    
    except requests.RequestException:
        pass
    
    return None

def amadeus_search_attractions(slots: Slots) -> List[Dict[str, Any]]:
    RADIUS = 20
    
    if not slots.destination_city_code:
        print("Missing destination city code for attractions.")
        return []
    token = get_amadeus_access_token()
    coords = _get_city_lat_lon(slots.destination_city_name, token)
    
    if not coords:
        return []
    
    lat, lon = coords
    
    url = f"{AMADEUS_URL}/v1/shopping/activities"
    headers = {"Authorization": f"Bearer {token}"}
    
    params = {
        "latitude": lat, "longitude": lon, "radius": RADIUS,
        "startDate": slots.dates.start, "endDate": slots.dates.end, 
        "page[limit]": 50
    }
    
    try:
        res = requests.get(url, headers=headers, params=params, timeout=30)
        res.raise_for_status()
        parsed = []
        
        for a in res.json().get('data', []):
            price_info = a.get('price', {}) or {}
            usd = convert_currency_to_usd(float(price_info.get('amount', 0.0) or 0.0),
                                          price_info.get('currencyCode', 'USD'))
            parsed.append({
                "name": a.get('name', 'N/A'),
                "description": a.get('shortDescription', '') or '',
                "rating": a.get('rating', 0.0),
                "price": usd,
                "currency": "USD",
                "link": a.get('bookingLink', 'N/A')
            })
        
        # filter by user interests if provided; otherwise keep all, then sort by rating desc, keep top 3
        interests = [s.lower() for s in (slots.attractions or [])]
        if interests:
            parsed = [p for p in parsed if any(kw in (p['name'] + " " + p.get('description','')).lower() for kw in interests)]
        
        parsed.sort(key=lambda x: float(x.get('rating', 0) or 0), reverse=True)
        
        #For debuggin
        for attration in parsed[:3]:
            print(attration)

        return parsed[:3]
    
    except requests.RequestException as e:
        print(f"Amadeus Attractions error: {e}")
        return []
