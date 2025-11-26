from pydantic import BaseModel, Field, model_validator
from typing import List, Optional, Dict, Union
from datetime import datetime
import ulid

#-------------------
# NLP BaseModel classes
#-------------------

# Travel Dates
class Dates(BaseModel):
    start: Optional[str] = None
    end: Optional[str] = None

# Features/Amenities of hotels. For example, free-WIFI, Breakfast, Pool, etc.
class HotelPreferences(BaseModel):
    request : Optional[bool] = None
    amenities: List[str] = []
    rating : Optional[int] = None

# Number of travelers / based on the frontend
class Pax(BaseModel):
    adults: Optional[int] = 0
    kids: Optional[int] = 0

# Slots to track
class Slots(BaseModel):

    slot_id: Optional[str] = None

    # For Amadeus Start
    origin_airport_code: Optional[str] = None
    destination_airport_code: Optional[str] = None
    destination_city_name : Optional[str] = None
    destination_city_code: Optional[str] = None
    # For Amadeus End

    dates: Dates = Dates()
    pax: Pax = Pax()    #Number of travelers
    budget: Optional[float] = None
    hotel: HotelPreferences = HotelPreferences()
    car: Optional[bool] = None
    attractions : List[str] = []

    @model_validator(mode="after")
    def _ensure_slot_id(self):
        if not self.slot_id:
            self.slot_id = ulid.new().str
        return self

    model_config = {
        "extra": "ignore"  # ignore stray keys from LLM/FE
    }

# User's text(natural language). For example, "SF to Doha Nov 10–15…"
class ChatRequest(BaseModel):
    message : str           # {"message": "SF to Doha Nov 10–15…" }
    current_slots : Optional[Slots] = None
    user_id : Optional[str] = None  # User ID for persistence (optional)
    chat_id : Optional[str] = None  # Chat ID for persistence (optional)

# Body for response from AI model
class ParseResponse(BaseModel):
    current_slots : Slots
    missing: List[str]              # list of slots that were not filled yet
    reply : Optional[str] = None

"""
# Body for response from AI model (Missing Only)
class ParseMissing(BaseModel):
    missing: List[str]              # list of slots that were not filled yet
    current_slots = Slots           # Current slots with slot_id
"""

# clarify endpoint body
class ClarifyRequest(BaseModel):
    missing: List[str]
    received: Optional[Slots] = None
    
# clarify enpoints response body | Relies from backend to frontend(user UI)
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
    price_per_person: float
    currency: str
    departure_time: str
    arrival_time: str 
    flight_type: Optional[str] = None   #Non-stop/Layover/Stopover/Transit
    link: Optional[str] = None

class HotelOption(BaseModel):
    name:str
    rating: Optional[int] = None
    total_price: float
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

class TravelOptionsResponse(BaseModel):
    plan_id: Optional[str] = None
    slot_id: Optional[str] = None
    flight : Optional[FlightOption] = None
    hotel : Optional[HotelOption] = None
    car : Optional[CarOption] = None
    attractions : List[AttractionOption] = []
    created_time: Optional[datetime] = None
    updated_time: Optional[datetime] = None
    reply : Optional[str] = None

# Union type for chat endpoint response
ChatResponse = Union[ParseResponse, TravelOptionsResponse]

"""
# Main response body
class TravelOptionsResponse(BaseModel):
    flights: List[FlightOption] = []
    hotels: List[HotelOption] = []
    cars: List[CarOption] = []
    attractions: List[AttractionOption] = []
"""