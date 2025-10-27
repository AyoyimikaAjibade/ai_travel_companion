from optparse import Option
import os
import requests
import math
import json
import traceback
from datetime import datetime
from typing import List, Dict, Optional, Tuple, Any
from dotenv import load_dotenv
from datetime import datetime

from base_models import CarOption, Slots, Pax

load_dotenv()

#API Keys, Secrets and Base URLs
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
EXPEDIA_KEY = os.getenv("EXPEDIA_API_KEY")
BOOKING_KEY = os.getenv("BOOKING_API_KEY")
TIQUETS_KEY = os.getenv("TIQETS_API_KEY")
AMADEUS_KEY = os.getenv("AMADEUS_API_KEY")

AMADEUS_SECRET = os.getenv("AMADEUS_API_SECRET")

# Double check the urls
AMADEUS_URL = "https://test.api.amadeus.com"
EXPEDIA_URL = "https://api.expediagroup.com/rapid/v3"
BOOKING_URL = "https://distribution-xml.booking.com/2.9"
TIQETS_URL = "https://api.tiqets.com/v2"

# -------------------------------------
# AI - Gemini to Parse User's request
# -------------------------------------
def call_gemini(user_message: str, current_slots: Optional[Slots]) -> dict:    
    print(f"✅ Loaded Gemini Key: {'Yes' if GEMINI_KEY else 'No'}")
    current_date = datetime.now().strftime("%Y-%m-%d")
    prompt = ""
    
    schema_body = {
        "current_slots": {
            "slot_id": "123",
            "origin_airport_code": "SFO",
            "destination_airport_code": "LHR",
            "destination_city_name": "LONDON",
            "destination_city_code":"LON",
            "dates": {"start": "2025-11-10", "end":"2025-11-20"},
            "pax": {"adults": 1, "kids": 1},
            "budget": 1500,
            "hotel": {"request": True, "amenities": ["breakfast", "pool"], "rating": 4},
            "car" : "null",   
            "attractions" : ["museum", "Eiffel Tower"]
            },
            "missing": ["car"],
            "reply" : "Your pax is updated!"
        }


    prompt = (
        "You are a travel-NLU extractor. Return EXACTLY ONE JSON with keys "
        '["current_slots","missing", "reply"].\n'
        "FILLING RULES:\n"
            "1) Airports must be IATA airport codes (e.g., SFO, JFK).\n" 
            "1.1) City name should be full name(e.g., Paris, Seoul, San Jose, New York) of the city. If the destination_city_name is null. make sure add the name to `missing`\n" 
            "1.2) City codes use IATA city codes (e.g., PAR, NYC, LON, SEL).If the destination_city_code is null. make sure add the name to `missing`\n"
            "2) Common mappings:\n"
            "   • \"SF\" / \"San Fran\" / \"San Francisco\" → origin_airport_code=SFO (unless clearly destination)\n"
            "   • \"Seoul\" → destination_airport_code=ICN, destination_city_name = Seoul, destination_city_code=SEL\n"
            "   • \"Paris\" → destination_airport_code=CDG (default), destination_city_name = Paris, destination_city_code=PAR\n"
            "3) pax:\n"
            "   • pax.adults = number of adults explicitly mentioned. If user did NOT mention number of adults explicitly, then set pas.adults = 1. Make sure (\"wife\", \"husband\", \"Fiancée\", \"Partner\", \"Boyfriend\", \"Girlfriend\") should be counted as adult.\n"
            "   • pax.kids = number of children explicitly mentioned (\"kids\", \"children\",\"boys\",\"girls\"). If none mentioned, set pax.kids=0.\n"
            "4) car/hotel:\n"
            "   • **car**: If user explicitly requests a rental car, set car=true. **If user explicitly says they DON'T need a car, set car=false. **In both cases, do NOT add car to `missing`. ONLY when car value is null or None, add car to `missing`\n"
            "   • **hotel**: If user explicitly requests a hotel, set hotel.request = True. If user says they DON'T need a hotel, set hotel.reqeust = False. In both case, do NOT add hotel to `missing`. ONLY when hotel.request value is null or None, add hotel to `missing`\n"
            "5) budget: \n"
            "   • parse numbers with symbols/abbreviations (\"$5k\" → 5000). Assume USD.\n"
            "   • If user did NOT explicitly mentioned, then add the field name to `missing`.\n"
            "6) dates: output ISO YYYY-MM-DD. Parse ranges like \"Nov 10 to Nov 25\".\n"
            "7) Inference & missing:\n"
            "   • If the value is null, then add the field name to `missing`.\n"
            "   • Fill only when unambiguous; otherwise omit and add the field name to `missing`.\n"
            "   • Do NOT invent values.\n"
            "8) **attractions**: If the user mentions specific activities or types of attractions (e.g., 'museums', 'Eiffel tower tour'), add them as strings to the `attractions` list.\n"
            "9) **reply**:\n"
            "   • If there is any item in the `missing`, fill reply field request to fill the missing field in **everyday language**. Don't use slot field names. \n"
            "   • If the user request change any information already filled, change the information and fill reply field with explaination what field is revised in everyday language.\n"
            "\n"
        "Output shape:\n"
        "{\n"
        '  "current_slots": {\n'
        '    "slot_id": string|null,\n'
        '    "origin_airport_code": string|null,\n'
        '    "destination_airport_code": string|null,\n'
        '    "destination_city_name": string|null,\n'
        '    "destination_city_code": string|null,\n'
        '    "dates": {"start": string|null, "end": string|null},\n'
        '    "pax": {"adults": int|1, "kids": int|0},\n'
        '    "budget": number|null,\n'
        '    "hotel": {"request": true|false|null, "amenities": [], "rating": int|null},\n'
        '    "car": true|false|null,\n'
        '    "attractions": []\n'
        "  },\n"
        '  "missing": ["..."],\n'
        '  "reply": ["..."]\n'
        "}\n"
        "\n"
        f"The current date is {current_date}.\\n\\n"
        "Current Slots:\n"
        f"{current_slots}\n\n"
        "User Message:\n"
        f"\"{user_message}\"\n\n"
        "JSON:"
    )


    GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_KEY}"
    headers = {
    "Content-Type": "application/json",
    "Accept": "application/json"
    }

    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature":0
        }
    }

    try:
        assert isinstance(headers, dict), f"headers is {type(headers)} (should be dict)"
   
        response = requests.post(GEMINI_API_URL, headers=headers, json=payload)
        response.raise_for_status()

        response_data = response.json()
        raw_json_string = response_data['candidates'][0]['content']['parts'][0]['text']
        
        print("--- 🖥️ Gemini Raw Output 🖥️ ---")
        print(raw_json_string)
        
        return json.loads(raw_json_string)

    except Exception as e:
        print("\n--- 🔴 GEMINI PARSE ERROR 🔴 ---")
        
        if 'response' in locals() and hasattr(response,'text'):
            print("--- RAW API RESPONSE FROM GOOGLE ---")
            print(response.text)
            print("------------------------------------")
       
        traceback.print_exc()
        print("------------------------------------")
        # Return an empty structure on failure
        return {"slots": {}, "missing": [], "reply": {}}


#-------------------
# API - function ofr get token
#-------------------
def get_amadeus_access_token() -> str:
    if not AMADEUS_KEY or not AMADEUS_SECRET:
        raise ValueError("Amadeus API Key and Secret must be set in .evn and valid")
    else:
        print(f"✅ Loaded Amadeus Key: {'Yes' if AMADEUS_KEY else 'No'}")
        print(f"✅ Loaded Amadeus Secret: {'Yes' if AMADEUS_SECRET else 'No'}")
    
    amadeus_auth_url = f"{AMADEUS_URL}/v1/security/oauth2/token"
    amadeus_auth_headers = {"Content-Type": "application/x-www-form-urlencoded"}
    payload = {
        "grant_type" : "client_credentials",
        "client_id" : AMADEUS_KEY,
        "client_secret" : AMADEUS_SECRET
    }

    try:
        response = requests.post(amadeus_auth_url, headers=amadeus_auth_headers, data= payload)
        response.raise_for_status()
        return response.json()["access_token"]
    except requests.RequestException as e:
        print(f"Error getting Amadeus access token: {e}")
        return None

#-------------------------
# API - function for flight -- 35% of budget
#-------------------------
def amadeus_search_flights(slots:Slots) -> List[Dict[str,Any]]:

    if not all ([slots.origin_airport_code, slots.destination_airport_code, slots.dates.start, slots.pax.adults]):
        print("Missing essential flight search information for Amadeus.")
        return []
    
    amadeus_access_token = get_amadeus_access_token()
    if not amadeus_access_token:
        print("Access Token is not valid")
        return []
    
    amadeus_search_flights_url = f"{AMADEUS_URL}/v2/shopping/flight-offers"
    amadeus_search_flights_header = {"Authorization" : f"Bearer {amadeus_access_token}"}
    
    amadeus_flight_paras = {
        "originLocationCode": slots.origin_airport_code,
        "destinationLocationCode": slots.destination_airport_code,
        "departureDate": slots.dates.start,
        "adults": slots.pax.adults,
        "children": slots.pax.kids, #Amadeus: children (2-11yrs)
        "currencyCode":"USD",
        "nonStop": "false",     #Could be True? = Non-stop
        "max": 5 # Limit to 5 results
        # Add price range?
    }

    #Round trip case
    if slots.dates.end:
        amadeus_flight_paras["returnDate"] = slots.dates.end

    try:
        # print("🛩️ Searching for flights...")
        response = requests.get(amadeus_search_flights_url, headers=amadeus_search_flights_header, params=amadeus_flight_paras)
        response.raise_for_status()
        offers = response.json()
        
        #print("--- 🛩️ Amadeus Flight Raw Output 🛩️ ---")
        #print(response.text)
    
        parsed_flights = []

        for offer in offers.get('data',[]):
            itinerary = offer.get('itineraries',[{}])[0]
            first_segment = itinerary.get('segments',[{}])[0]

            parsed_flights.append({
                "airline": first_segment.get('carrierCode', 'N/A'), # Note: This gives IATA code, not name
                "price": float(offer.get('price', {}).get('total', 0)),
                "currency": offer.get('price', {}).get('currency', 'USD'),
                "departure_time": first_segment.get('departure', {}).get('at', 'N/A'),
                "arrival_time": itinerary.get('segments', [{}])[-1].get('arrival', {}).get('at', 'N/A'),
                "link": "https://www.amadeus.com" # Placeholder link
            })

        for flight in parsed_flights:
            if flight:
                print(flight)
            else:
                print("No parsed flight")

        return parsed_flights
    
    except requests.RequestException as e:
        print(f"Error calling Amadeus Flight Offers Search: {e}")
        return[]

#-------------------------
# API - functions for hotel -- 30% of budget
#-------------------------
# Amadeus hotel-amenity enums (hotel-level)
AMENITY_MAP : Dict[str, str] = {
    "wifi": "WIFI",
    "wi-fi": "WIFI",
    "pool": "SWIMMING_POOL",
    "parking": "PARKING",
    "restaurant": "RESTAURANT",
    "gym": "FITNESS_CENTER",
    "spa": "SAUNA",  # tip: expand if you want JACUZZI/MASSAGE, etc.
    "pets": "PETS_ALLOWED",
    "ev_charger": "ELECTRIC_CAR_CHARGING_STATION",
}

# Room board/meal mapping for offers (room-level)
MEAL_MAP: Dict[str, str] = {
    "breakfast": "BREAKFAST",
    "room_only": "ROOM_ONLY",
    "half_board": "HALF_BOARD",
    "full_board": "FULL_BOARD",
    "all_inclusive": "ALL_INCLUSIVE",
}

def _map_hotel_amenities(user_amenities: Optional[List[str]]) -> Optional[str]:
    if not user_amenities:
        return None
    enums = []
    for amenity in user_amenities:
        if not amenity:
            continue
        enums.append(AMENITY_MAP.get(amenity.strip().lower(), amenity.strip().upper()))
    return ",".join(sorted(set(enums))) if enums else None

def _map_meals(user_meals: Optional[List[str]]) -> Optional[str]:
    if not user_meals:
        return None
    enums = []
    for meal in user_meals:
        if not meal:
            continue
        enums.append(MEAL_MAP.get(meal.strip().lower(), meal.strip().upper()))
    return ",".join(sorted(set(enums))) if enums else None

def chunked(seq,size):
    for i in range(0,len(seq),size):
        yield seq[i:i+size]

def pick(container, key, default=None):
    if isinstance(container, dict):
        return container.get(key, default)
    return getattr(container, key, default)

# Get hotel IDs filtered by star rating + hotel amenities 
def amadeus_get_hotel_ids(city_code: str, access_token:str, limit:int = 60,
                            min_rating : Optional[int] = None,  # 4 or 5 star hotel
                            amenities: Optional[List[str]] = None   #["breakfast", "pool"]
    ) -> List[str]:
    
    RADIUS = 5

    headers = {
        "Authorization": f"Bearer {access_token}", 
        "Accept": "application/json",
    }
    
    url_city = f"{AMADEUS_URL}/v1/reference-data/locations/hotels/by-city"
    params_city = {"cityCode":city_code}

    # ratings param expects a CSV list like "4,5"
    if min_rating:
        # include min..5 (e.g., 4 and 5)
        params_city["ratings"] = ",".join(str(rating) for rating in range(min_rating, 6) if rating <= 5)

    mapped_amenities = _map_hotel_amenities(amenities)
    if mapped_amenities:
        params_city["amenities"] = mapped_amenities
    # (optional) tighten radius if you want:
        params_city["radius"] = RADIUS
        params_city["radiusUnit"] = "KM"

    response = requests.get(url_city, headers=headers,params=params_city, timeout=30)
    if response.ok:
        response.raise_for_status()
        data = response.json()

        ids:List[str] = []
        for item in data.get("data",[]):
            hotel_id = item.get("hotelId")
            if hotel_id:
                ids.append(hotel_id)
                if len(ids) >= limit:
                    break
        return ids

    # Fallback: use by-geocode with same filters
    print("by-city error body:", response.text)

    url_loc = f"{AMADEUS_URL}/v1/reference-data/locations"
    params_loc = {"keyword": city_code, "subType": "CITY", "page[limit]": 1}
    resp_loc = requests.get(url_loc, headers=headers, params=params_loc, timeout=30)
    resp_loc.raise_for_status()
    loc_data = resp_loc.json()
    items = loc_data.get("data", [])
    if not items:
        return []

    geo = items[0].get("geoCode") or {}
    lat, lon = geo.get("latitude"), geo.get("longitude")
    if lat is None or lon is None:
        return []

    # 2) Query hotels/by-geocode
    url_geo = f"{AMADEUS_URL}/v1/reference-data/locations/hotels/by-geocode"
    params_geo = {
        "latitude": str(lat),
        "longitude": str(lon),
        "radius": RADIUS,         
        "radiusUnit": "KM",
        #"page[limit]": limit,
    }

    if min_rating:
        params_geo["ratings"] = ",".join(str(r) for r in range(min_rating, 6) if r <= 5)
    if mapped_amenities:
        params_geo["amenities"] = mapped_amenities

    resp_geo = requests.get(url_geo, headers=headers, params=params_geo, timeout=30)
    resp_geo.raise_for_status()
    data_geo = resp_geo.json()

    ids: List[str] = []
    for item in data_geo.get("data", []):
        hid = item.get("hotelId")
        if hid:
            ids.append(hid)
            if len(ids) >= limit:
                break
    return ids

# Search offers, filter by MEALS (breakfast), pick cheapest
def amadeus_search_hotels(slots: Slots) -> List[Dict[str, Any]]:
    if not all([slots.destination_city_code, slots.dates.start, slots.dates.end, slots.pax.adults]):
        print("Missing essential hotel search information for Amadeus.")
        return []

    access_token = get_amadeus_access_token()
    if not access_token:
        return []

    # read user prefs from slots.hotel
    hotel_pref = getattr(slots, "hotel", None)
    min_rating = pick(hotel_pref, "rating", None)   # 4 star hotel
    wanted_hotel_amenities = pick(hotel_pref, "amenities", []) or [] # e.g., ["breakfast"] (breakfast is room-level; pool is hotel-level)

    check_in = datetime.strptime(slots.dates.start, "%Y-%m-%d")
    check_out = datetime.strptime(slots.dates.end, "%Y-%m-%d")

    staying_nights = (check_out - check_in).days
    print(f"Total nights to stay: {staying_nights} nighgt(s)\n")

    room_meals = []
    hotel_amenities = []
    for amenity in wanted_hotel_amenities:
        if amenity and amenity.strip().lower() in ("breakfast", "room_only", "half_board", "full_board", "all_inclusive"):
            room_meals.append(amenity)
        else:
            hotel_amenities.append(amenity)

    meals_param = _map_meals(room_meals)  # e.g., "BREAKFAST"

    try:
        hotel_ids = amadeus_get_hotel_ids(
            slots.destination_city_code,
            access_token,
            limit=60,
            min_rating=min_rating,
            amenities=hotel_amenities
        )

        if not hotel_ids:
            print(f"No hotel IDs found for city {slots.destination_city_code}")
            return []
        
        amadeus_search_hotels_url = f"{AMADEUS_URL}/v3/shopping/hotel-offers"
        amadeus_search_hotels_headers = {"Authorization": f"Bearer {access_token}"}

        # To limit the results from API
        MAX_IDS = 20
        MAX_TOTAL_RESULTS = 40

        # For room quantity based on the people
        total_people = slots.pax.adults + slots.pax.kids
        room_qty = max(1, math.ceil(total_people/2))

        cheapest: Optional[Dict[str,Any]] = None

        for batch_ids in chunked(hotel_ids, MAX_IDS):
            amadeus_hotel_params = {
                "hotelIds": ",".join(batch_ids),
                "checkInDate": slots.dates.start,
                "checkOutDate": slots.dates.end,
                "adults": slots.pax.adults,
                "roomQuantity": room_qty,
                # "ratings": "4,5" # Example: search for 4 and 5 star hotels
                "bestRateOnly": "true",
                "currencyCode" : "USD"
            }
            if meals_param:
                amadeus_hotel_params["meals"] = meals_param  # ensures offers that include breakfast

        
            # print("🏨 Searching for hotels with Amadeus...")
            response = requests.get(amadeus_search_hotels_url, headers=amadeus_search_hotels_headers, params=amadeus_hotel_params)
            response.raise_for_status()
            data = response.json()
            
            for hotel_offer in data.get('data', []):
                hotel = hotel_offer.get('hotel', {}) or {}
                for offer in hotel_offer.get('offers', []) or []:
                    # sanity check meals if API returns fields (boardType/mealPlan.type)
                    board = offer.get("boardType") or (offer.get("mealPlan", {}) or {}).get("type")
                    if meals_param and board and "BREAKFAST" not in board.upper():
                        continue

                    price = (offer.get("price", {}) or {}).get("total")
                    try:
                        total_price = float(price) if price is not None else None
                    except Exception:
                        total_price = None
                    if total_price is None:
                        continue
                    
                    price_per_night = total_price/staying_nights

                    candidate = {
                        "hotel_id": hotel.get("hotelId"),
                        "name": hotel.get("name", "N/A"),
                        "rating": min_rating,
                        "total_price": total_price,
                        "price_per_night": price_per_night,
                        "currency": (offer.get("price", {}) or {}).get("currency", "USD"),
                        "board": board,  # breakfast indicator for FE
                        "offer_id": offer.get("id"),
                        "link": "https://www.amadeus.com",  # placeholder
                    }

                    if (cheapest is None) or (total_price < cheapest["total_price"]):
                        cheapest = candidate

        # 3) Return only the cheapest match (still as a list for compatibility)
        return [cheapest] if cheapest else []    

    except requests.RequestException as e:
        print(f"Error calling Amadeus Hotels API: {e}")
        return []

#-------------------------
# API - functions for attrations -- 25% of budget
#-------------------------
def _get_city_lat_lon(city_name: str, access_token: str) -> Optional[Tuple[float, float]]:
    #Helper function to get latitude and longitude for a city code.
    
    url = f"{AMADEUS_URL}/v1/reference-data/locations/cities"
    params = {"keyword": city_name}
    
    headers = {"Authorization": f"Bearer {access_token}"}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json().get("data", [])
        if not data:
            print(f"Could not find location data for city code: {city_name}")
            return None
        geo_code = data[0].get("geoCode", {})
        lat = geo_code.get("latitude")
        lon = geo_code.get("longitude")
        if lat is not None and lon is not None:
            return float(lat), float(lon)
        return None
    except requests.RequestException as e:
        print(f"Error getting city coordinates: {e}")

    # Fallback - Find based on the locations -----------------------------------------------
    url_locatio = f"{AMADEUS_URL}/v1/reference-data/locations"
    params_location = {"keyword": city_name, "subType": "CITY", "page[limit]": 1}
    try:
        r = requests.get(url_locatio, headers=headers, params=params_location, timeout=10)
        r.raise_for_status()
        data = r.json().get("data", [])
        if data:
            geo = data[0].get("geoCode", {})
            lat = geo.get("latitude")
            lon = geo.get("longitude")
            if lat is not None and lon is not None:
                return float(lat), float(lon)
    except requests.RequestException as e:
        print(f"[locations] geocode error: {e}")

    print(f"Could not resolve coordinates for city code: {city_name}")
    return None

def amadeus_search_attractions(slots: Slots) -> List[Dict[str, Any]]:
    if not slots.destination_city_code:
        print("Missing destination city code for Amadeus attractions search.")
        return []

    access_token = get_amadeus_access_token()
    if not access_token:
        return []
    
    # 1. Get coordinates for the destination city
    coords = _get_city_lat_lon(slots.destination_city_name, access_token)
    # print(f"coords for {slots.destination_city_code} is: {coords}")

    if not coords:
        print(f"Could not retrieve coordinates for {slots.destination_city_code}.")
        return []
    
    lat, lon = coords
    
    # 2. Search for attractions using coordinates
    attractions_url = f"{AMADEUS_URL}/v1/shopping/activities"
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {
        "latitude": lat,
        "longitude": lon,
        "radius": 20,  # Search within a 20 KM radius
        "startDate" : slots.dates.start,
        "endDate" : slots.dates.end,
        "page[limit]": 50  # limits the response to 20 attractions
        # Add price range?
    }

    try:
        # print("\n🎭 Searching for attractions...")
        response = requests.get(attractions_url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()

        parsed_attractions = []
        for activity in data.get('data', []):
            price_info = activity.get('price', {})
            parsed_attractions.append({
                "name": activity.get('name', 'N/A'),
                "description": activity.get('shortDescription', '') or '',
                "rating" : activity.get('rating',0.0),
                "price": float(price_info.get('amount', 0.0)),  #price.amount?
                "currency": price_info.get('currencyCode', 'USD'),  #price.currencyCode?
                "link": activity.get('bookingLink', 'N/A')
            })

        # final_attractions = parsed_attractions

    
        # 3. Filter results based on user's interests
        final_attractions = []
        user_interests = [attraction.lower() for attraction in (slots.attractions or [])]
        
        if user_interests:
            print(f"\n🔎 Filtering attractions based on interests: {user_interests}")
            for attraction in parsed_attractions:
                # Check if any interest keyword is in the attraction's name and description
                haystack = f"{attraction['name']} : {attraction.get('description','')}".lower()
                if any(user_interest in haystack for user_interest in user_interests):
                    final_attractions.append(attraction)
        else:
            # If user has no specific interests, use all results
            final_attractions = parsed_attractions
        

        # 4. Sort results by price or rating
        # 4.1 - Sorts from cheapest to most expensive
        # sorted_attractions = sorted(final_attractions, key=lambda x: x.get('price', float('inf')))

        # 4.2 - Sorts from high rating to low rating
        sorted_attractions = sorted(final_attractions, key=lambda x: float(x.get('rating', 0) or 0), reverse=True)
        
        # Limit the final output after sorting
        final_list = sorted_attractions[:3]

        print(f"✅ Found and processed {len(final_list)} attractions.")
        for attraction in final_list:
            print(attraction)

        return final_list

    except requests.RequestException as e:
        print(f"Error calling Amadeus Attractions API: {e}")
        return []

#-------------------------
# API - functions for rental car -- 10% of budget
#-------------------------
def infer_car_types_by_pax(pax: Pax) -> List[str]:
    adults = pax.adults or 0
    kids = pax.kids or 0
    total = adults + kids

    # Simple, predictable rules:
    if total <= 2:
        # Couple / solo
        return ["Sedan - Compact", "Sedan - Standard", "SUV - Compact"]

    if total in (3, 4):
        # Small family or 3-4 adults
        # Prefer SUVs for cargo/comfort
        return ["SUV - Standard", "SUV - Compact", "Sedan - Standard"]

    if total >= 5:
        # Larger group: space first
        return ["Minivan", "SUV - Full", "SUV - Standard"]

    # Fallback (shouldn't hit)
    return ["Sedan - Standard", "SUV - Compact"]

def car_search_mock(slots:Slots, cars_json:Dict[str, Any]) -> CarOption:
    options = [CarOption(**c) for c in cars_json.get("rental_cars", [])]
    if not options:
        raise ValueError("No car options available.")

    preferred_types = infer_car_types_by_pax(slots.pax)

    # find the first type with matches
    for ct in preferred_types:
        matches = [o for o in options if o.car_type.lower() == ct.lower()]
        if matches:
            # deterministic: pick cheapest
            return sorted(matches, key=lambda o: o.price_per_day)[0]

    # if nothing matched (e.g., JSON missing those types), pick the overall cheapest
    return sorted(options, key=lambda o: o.price_per_day)[0]