# -------------------------------------------------------------------
# To test API endpoints
# 1. Get you Gemini API key and copy to .env file
# 2. python3 -m venv venv
# 3. source venv/bin/activate
# 4. pip3 install uvicorn fastapi python-dotenv requests
# 5. python3 -m uvicorn ai_npu:app --reload --host 0.0.0.0
# 6. Swagger UI: http://127.0.0.1:8000/docs
# 7. deactivate (to close venv)
# -------------------------------------------------------------------

from fastapi import FastAPI
from dotenv import load_dotenv
from datetime import datetime
from api_services import amadeus_search_flights,amadeus_search_hotels
from base_models import (
    Request,ParseResponse, ClarifyRequest, ClarifyResponse,
    TravelOptionsResponse,Slots,FlightOption,HotelOption
)
import os
import json
import traceback
import requests

load_dotenv()
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
#gemini.configure(api_key=GEMINI_KEY)
print(f"✅ Loaded Gemini Key: {'Yes' if GEMINI_KEY else 'No'}")

app = FastAPI (
        title = "TWOS AI NLP Testing",
        description="AI-powered Travel planner",
        version="1.0.0"
    )

# -------------------------------------
# AI - Gemini to Parse User's request
# -------------------------------------
def call_gemini(user_message: str) -> dict:    
        
    schema_body = {
            "slots": {
                    "origin_airport_code": "SFO",
                    "destination_airport_code": "LHR",
                    "destination_city_code":"LON",
                    "dates": {"start": "2025-11-10", "end":"2025-11-20"},
                    "pax": {"adults": 1, "kids": 1},
                    "budget": 1500,
                    "hotel": {"amenities": ["breakfast", "pool"]},
                    "car" : False
                    },
            "missing": ["car"],
            "confidence": {
                    "origin_airport_code": 0.9,
                    "destination_airport_code": 0.9,
                    "destination_city_code":0.9,
                    "dates": 0.9,
                    "pax": 0.9,
                    "budget": 0.9,
                    "hotel": 0.9
                    }
            }

    current_date = datetime.now().strftime("%Y-%m-%d")

    prompt = (
        "You are a travel-NLU extractor. Extract slots and return ONLY valid JSON.\n"
        "\n"
        "OUTPUT CONTRACT (strict):\n"
        "- Respond with exactly ONE JSON object.\n"
        "- Keys allowed at the top level: {\"slots\", \"missing\", \"confidence\"}.\n"
        "- In slots, only these keys: {\"origin_airport_code\",\"destination_airport_code\",\"destination_city_code\",\"dates\",\"pax\",\"budget\",\"hotel\",\"car\"}.\n"
        "- Do NOT output null anywhere. If you cannot fill a value, OMIT that field and list its name in `missing`.\n"
        "- Confidence: provide 0.0–1.0 only for fields you filled.\n"
        "\n"
        "FILLING RULES:\n"
        "1) Airports must be IATA airport codes (e.g., SFO, JFK). Hotels/city use IATA city codes (e.g., PAR, NYC, LON, SEL).\n"
        "2) Common mappings:\n"
        "   • \"SF\" / \"San Fran\" / \"San Francisco\" → origin_airport_code=SFO (unless clearly destination)\n"
        "   • \"Seoul\" → destination_airport_code=ICN, destination_city_code=SEL\n"
        "   • \"Paris\" → destination_airport_code=CDG (default), destination_city_code=PAR\n"
        "3) pax:\n"
        "   • pax.adults = number of adults explicitly mentioned.\n"
        "   • pax.kids = number of children explicitly mentioned (\"kids\", \"children\"). If none mentioned, set pax.kids=0.\n"
        "4) car/hotel:\n"
        "   • If message mentions a rental car, set car=true.\n"
        "   • If user says they DON'T need a hotel, set hotel.amenities=[ ] and do NOT add hotel to `missing`.\n"
        "5) budget: parse numbers with symbols/abbreviations (\"$5k\" → 5000). Assume USD.\n"
        "6) dates: output ISO YYYY-MM-DD. Parse ranges like \"Nov 10 to Nov 25\".\n"
        "7) Inference & missing:\n"
        "   • Fill only when unambiguous; otherwise omit and add the field name to `missing`.\n"
        "   • Do NOT invent values.\n"
        "\n"
        f"The current date is {current_date}.\\n\\n"
        "Schema shape example (values are illustrative only):\n"
        f"{json.dumps(schema_body, indent=2)}\\n\\n"
        "Few-shot examples (format to mimic):\n"
        "Example A:\n"
        "User: \"I want to fly from San Francisco to Paris for 2 adults from Nov 10 to Nov 20 and I need a 4 or 5 star hotel\"\n"
        "JSON:\n"
        "{\n"
        "  \"slots\": {\n"
        "    \"origin_airport_code\": \"SFO\",\n"
        "    \"destination_airport_code\": \"CDG\",\n"
        "    \"destination_city_code\": \"PAR\",\n"
        "    \"dates\": {\"start\":\"2025-11-10\",\"end\":\"2025-11-20\"},\n"
        "    \"pax\": {\"adults\":2, \"kids\":0},\n"
        "    \"hotel\": {\"amenities\": []}\n"
        "  },\n"
        "  \"missing\": [],\n"
        "  \"confidence\": {\"origin_airport_code\":0.9,\"destination_airport_code\":0.9,\"destination_city_code\":0.9,\"dates\":0.9,\"pax\":0.9,\"hotel\":0.9}\n"
        "}\n"
        "\n"
        "Example B:\n"
        "User: \"I am planning a family trip from SF to Seoul. There are 4 people, 2 adults and 2 kids. From Nov 10 to Nov 25. I need a rental car during the trip. I don't need a hotel. My budget is $5k.\"\n"
        "JSON:\n"
        "{\n"
        "  \"slots\": {\n"
        "    \"origin_airport_code\": \"SFO\",\n"
        "    \"destination_airport_code\": \"ICN\",\n"
        "    \"destination_city_code\": \"SEL\",\n"
        "    \"dates\": {\"start\":\"2025-11-10\",\"end\":\"2025-11-25\"},\n"
        "    \"pax\": {\"adults\":2, \"kids\":2},\n"
        "    \"budget\": 5000,\n"
        "    \"hotel\": {\"amenities\": []},\n"
        "    \"car\": true\n"
        "  },\n"
        "  \"missing\": [],\n"
        "  \"confidence\": {\"origin_airport_code\":0.9,\"destination_airport_code\":0.9,\"destination_city_code\":0.9,\"dates\":0.9,\"pax\":0.9,\"budget\":0.9,\"car\":0.9}\n"
        "}\n"
        "\n"
        f"User message: \\\"{user_message}\\\"\\n\\n"
        "JSON Response:"
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
        
        # AI_model = gemini.GenerativeModel("gemini-1.5-flash", generation_config={"response_mime_type":"application/json"})
        # response = AI_model.generate_content(prompt)
        response = requests.post(GEMINI_API_URL, headers=headers, json=payload)
        response.raise_for_status()

        raw_json_string = response.json()['candidates'][0]['content']['parts'][0]['text']
        print("--- 🔴 Gemini Raw Output 🔴 ---")
        print(response.text)
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
        "origin_airport_code": "Where are you flying from?",
        "destination_airport_code": "Where are you going?",
        "destination_city_code": "What city are you staying in? (e.g., London)",
        
        "dates": "What dates are you planning to travel?",
        "pax": "How many people are going to travel?",
        "budget": "What's your total travel budget(USD?)",
        "car": "Do you need a rental car during your travel?",
        "hotel": "Any must-have hotel ameities? (ex: breakfast, pool)?"
    }
    
    missing_info = request.missing[0]
    return ClarifyResponse(question=missing_info_map.get(missing_info, f"Could you provide {missing_info}?"))

@app.post("/search", response_model=TravelOptionsResponse)
def search_options(slots:Slots):
    print("Received slots for search: ", slots.model_dump())

    flight_results = amadeus_search_flights(slots)
    hotel_results = amadeus_search_hotels(slots)

    return TravelOptionsResponse(
        flights=[FlightOption(**flight) for flight in flight_results],
        hotels=[HotelOption(**hotel) for hotel in hotel_results],
    )

"""
@app.post("/preference/update")
def preference_update(request: PreferenceUpdate): 
"""