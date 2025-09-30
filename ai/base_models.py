from pydantic import BaseModel
from typing import List, Optional, Dict

#-------------------
# NLP BaseModel classes
#-------------------

# Travel Dates
class Dates(BaseModel):
    start: Optional[str] = None
    end: Optional[str] = None

# Features/Amenities of hotels. For example, free-WIFI, Breakfast, Pool, etc.
class HotelPreferences(BaseModel):
    amenities: List[str] = []

# Number of travelers / based on the frontend
class Pax(BaseModel):
    adults: Optional[int] = 1
    kids: Optional[int] = 0

# Slots to track
class Slots(BaseModel):
    # origin: Optional[str] = None
    # destination: Optional[str] = None

    # For Amadeus Start
    origin_airport_code: Optional[str] = None
    destination_airport_code: Optional[str] = None
    destination_city_code: Optional[str] = None
    # For Amadeus End

    dates: Dates = Dates()
    pax: Pax = Pax()    #Number of travelers
    budget: Optional[float] = None
    hotel: HotelPreferences = HotelPreferences()
    car: Optional[bool] = None

# User's text(natural language). For example, “SF to Doha Nov 10–15…”
class Request(BaseModel):
    message : str           # {"message": “SF to Doha Nov 10–15…” }

# Body for response from AI model
class ParseResponse(BaseModel):
    slots : Slots
    missing: List[str]              # list of slots that were not filled yet
    confidence: Dict[str,float] = {}

# nlu/clarify endpoint body
class ClarifyRequest(BaseModel):
    missing: List[str]
    received: Optional[Slots] = None
    
# nlu/clarify enpoints response body | Relies from backend to frontend(user UI)
class ClarifyResponse(BaseModel):
    question: str
    options: Optional[List[str]] = None

# /preference/update endpoint body
class PreferenceUpdate(BaseModel):
    userID : str
    signal : str
    data: Dict[str, object] = {}

#-------------------------
# API Response Models
#-------------------------

class FlightOption(BaseModel):
    airline: str
    price: float
    currency: str
    departure_time: str
    arrival_time: str 
    flight_type: Optional[str] = None   #Non-stop/Layover/Stopover/Transit
    link: Optional[str] = None

class HotelOption(BaseModel):
    name:str
    rating: Optional[float] = None
    price_per_night: float
    currency: str
    link: Optional[str] = None

class CarOption(BaseModel):
    company: str
    car_type:str
    price_per_day:float
    currency:str
    link: Optional[str] = None

class AttractionOption(BaseModel):
    name:str
    price: float
    currency:str
    link: Optional[str] = None

# Main response body
class TravelOptionsResponse(BaseModel):
    flights: List[FlightOption] = []
    hotels: List[HotelOption] = []
    cars: List[CarOption] = []
    attractions: List[AttractionOption] = []