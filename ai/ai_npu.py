# -------------------------------------------------------------------
# To test API endpoints
# 1. Get you Gemini API key and copy to .env file
# 2. pip3 install uvicorn fastapi python-dotenv requests
# 3. python3 -m uvicorn ai_npu:app --reload --host 0.0.0.0
# 4. Swagger UI: http://127.0.0.1:8000/docs
# -------------------------------------------------------------------

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List,Optional,Dict
from dotenv import load_dotenv
from datetime import datetime
import os
import json
import traceback
import requests
#import google.generativeai as gemini
#import openai

load_dotenv()
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
#gemini.configure(api_key=GEMINI_KEY)

app = FastAPI (
        title = "TWOS AI NPU Testing",
        description="AI-powered Travel planner",
        version="1.0.0"
    )

#-------------------
# BaseModel classes
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
    adults: Optional[int] = None

# Slots to track
class Slots(BaseModel):
    origin: Optional[str] = None
    destination: Optional[str] = None
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

# -------------------------------------
# AI - Gemini to Parse User's request
# -------------------------------------
def call_gemini(user_message: str) -> dict:    
        
    schema_body = {
            "slots": {
                    "origin": "SFO",
                    "destination": "DOH",
                    "dates": {"start": "2025-11-10", "end":"2025-11-20"},
                    "pax": {"adults": 1},
                    "budget": 1500,
                    "hotel": {"amenities": ["breakfast", "pool"]},
                    "car" : False
                    },
            "missing": ["car"],
            "confidence": {
                    "origin": 0.9,
                    "destination": 0.9,
                    "dates": 0.9,
                    "pax": 0.9,
                    "budget": 0.9,
                    "hotel": 0.9
                    }
            }

    current_date = datetime.now().strftime("%Y-%m-%d")

    prompt = (
        f"You are a helpful travel assistant. Your task is to extract travel information from the user's message. "
        f"The current date is {current_date}. Respond ONLY with valid JSON that matches this schema.\n"
        "Do NOT add any extra text, markdown, or code fences.\n\n"
        f"Schema example:\n{json.dumps(schema_body, indent=2)}\n\n"
        f'User message: "{user_message}"\n\n'
        "JSON Response:"
    )

    API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_KEY}"
    headers = {'Content-Type': 'application/json'}
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "response_mime_type": "application/json",
        }
    }

    try:
        # AI_model = gemini.GenerativeModel("gemini-1.5-flash", generation_config={"response_mime_type":"application/json"})
        # response = AI_model.generate_content(prompt)
        response = requests.post(API_URL, headers=headers, json=payload)
        response.raise_for_status()

        raw_json_string = response.json()['candidates'][0]['content']['parts'][0]['text']
        return json.loads(raw_json_string)
    


    except Exception as e:
        print(f"--- GEMINI PARSE ERROR ---")
        traceback.print_exc()
        print(f"--------------------------")
       
        # Return an empty structure on failure
        return {"slots": {}, "missing": [], "confidence": {}}


#----------
# Endponts
#----------

@app.get("/")
def root():
    return {"message": "Welcome to the TWOS!"}

# To test the service is alive
@app.get("/health")
def health():
    return {"Live": True, "mode": "AI"}

# Parse the user's request (natural language text)
@app.post("/nlu/parse", response_model = ParseResponse)
def parse(request: Request):
    result = call_gemini(request.message)
    
    slots_dict = result.get("slots", {})
    missing = result.get("missing", [])
    confidence = result.get("confidence", {})

    try:
        slots = Slots(**slots_dict)
    except Exception as e:
        print("SLOTS PARSE ERROR", repr(e), "payload", slots_dict)
        slots = Slots()

    return ParseResponse(slots=slots, missing=missing, confidence=confidence)

@app.post("/nlu/clarify", response_model=ClarifyResponse)
def clarify(request: ClarifyRequest):

    #If there is no missing information
    if not request.missing:
        return ClarifyResponse(question="Anything else to add?")
    
    missing_info_map = {
        "origin": "Where are you flying from?",
        "destination": "Where are you going>",
        "dates": "What dates are you planning to travel?",
        "pax": "How many people are going to travel?",
        "budget": "What's your total travel budget(USD?)",
        "car": "Do you need a rental car during your travel?",
        "hotel": "Any must-have hotel ameities? (ex: breakfast, pool)?"
    }
    
    missing_info = request.missing[0]
    return ClarifyResponse(question=missing_info_map.get(missing_info, f"Could you provide {missing_info}?"))

"""
@app.post("/preference/update")
def preference_update(request: PreferenceUpdate): 
"""