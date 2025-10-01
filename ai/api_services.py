import os
import requests
import math
from typing import List, Dict, Any
from dotenv import load_dotenv

from base_models import Slots

load_dotenv()

#API Keys, Secrets and Base URLs
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

#-------------------
# API search functions
#-------------------

def get_amadeus_access_token() -> str:
    if not AMADEUS_KEY or not AMADEUS_SECRET:
        raise ValueError("Amadeus API Key and Secret must be set in .evn and valid")

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

# Call Amadeus Flight Offers Search
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
    }

    #Round trip case
    if slots.dates.end:
        amadeus_flight_paras["returnDate"] = slots.dates.end

    try:
        print("Searching for flights...")
        response = requests.get(amadeus_search_flights_url, headers=amadeus_search_flights_header, params=amadeus_flight_paras)
        response.raise_for_status()
        offers = response.json()
        
        print("--- 🔴 Amadeus Flight Raw Output 🔴 ---")
        print(response.text)
    
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

def amadeus_get_hotel_ids(city_code: str, access_token:str, limit:int = 10) -> List[str]:
    
    headers = {
        "Authorization": f"Bearer {access_token}", 
        "Accept": "application/json",
    }
    
    url_city = f"{AMADEUS_URL}/v1/reference-data/locations/hotels/by-city"
    params_city = {"cityCode":city_code}

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
        "radius": 5,          # km
        #"radiusUnit": "KM",
        #"page[limit]": limit,
    }
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

def chunked(seq,size):
    for i in range(0,len(seq),size):
        yield seq[i:i+size]

# Amadeus Hotel Search 
def amadeus_search_hotels(slots: Slots) -> List[Dict[str, Any]]:
    if not all([slots.destination_city_code, slots.dates.start, slots.dates.end, slots.pax.adults]):
        print("Missing essential hotel search information for Amadeus.")
        return []

    access_token = get_amadeus_access_token()
    if not access_token:
        return []
    
    try:
        hotel_ids = amadeus_get_hotel_ids(slots.destination_city_code,access_token,limit=60)
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

        parsed_hotels = []
        for batch_ids in chunked(hotel_ids,MAX_IDS):
            amadeus_hotel_params = {
                "hotelIds": ",".join(batch_ids),
                "checkInDate": slots.dates.start,
                "checkOutDate": slots.dates.end,
                "adults": slots.pax.adults,
                "roomQuantity": room_qty,
                # "ratings": "4,5" # Example: search for 4 and 5 star hotels
                "bestRateOnly": "true",
                "currency" : "USD"
            }

        
            print("Searching for hotels with Amadeus...")
            response = requests.get(amadeus_search_hotels_url, headers=amadeus_search_hotels_headers, params=amadeus_hotel_params)
            response.raise_for_status()
            data = response.json()
            
            for hotel_offer in data.get('data', []):
                hotel = hotel_offer.get('hotel', {})
                offers = hotel_offer.get('offers', [])
                if not offers:
                    continue
                offer = offers[0]

                parsed_hotels.append({
                    "name": hotel.get('name', 'N/A'),
                    "rating": None, # v3 removed rating; keep None or query Hotel Ratings API seperately
                    "price_per_night": float(offer.get('price', {}).get('total', 0) or 0),
                    "currency": offer.get('price', {}).get('currency', 'USD'),
                    "link": "https://www.amadeus.com" # Placeholder
                })

                if len(parsed_hotels) >= MAX_TOTAL_RESULTS:
                    break
            if len(parsed_hotels) >= MAX_TOTAL_RESULTS:
                break
            
        for hotel in parsed_hotels:
            if hotel:
                print(hotel)
            else:
                print("No parsed hotel")

        return parsed_hotels

    except requests.RequestException as e:
        print(f"Error calling Amadeus Hotels API: {e}")
        return []