# -----------------------------------------------------
# AI(NLP) - Service that Gemini parses user's request
# -----------------------------------------------------

import json, traceback, requests
from datetime import datetime
from typing import Optional
from base_models import Slots
from .config import GEMINI_KEY

def call_gemini(user_message: str, current_slots: Optional[Slots]) -> dict:    
    current_date = datetime.now().strftime("%Y-%m-%d")
    
    # Convert current_slots to JSON format for better parsing
    current_slots_json = "{}"
    if current_slots:
        try:
            current_slots_dict = current_slots.model_dump(mode='json', exclude_none=False)
            current_slots_json = json.dumps(current_slots_dict, indent=2)
        except Exception:
            current_slots_json = "{}"

    prompt = (
        "You are a professional travel planner. You need to extract information from customer's natural language."
        "Return EXACTLY ONE JSON with keys "
        '["current_slots","missing", "reply"].\n\n'
        "CRITICAL: PRESERVE EXISTING VALUES\n"
        "   • If a field already has a value in Current Slots and the user does NOT mention changing it, "
        "       you MUST include that existing value in your output.\n"
        "   • ONLY change values when the user explicitly requests a change.\n"
        "   • If the user only mentions new information, preserve all existing values and add the new information.\n"
        "   • For nested objects (dates, pax, hotel), preserve existing values unless the user mentions changes.\n\n"
        "FILLING RULES:\n"
            "1) Airports must be IATA airport codes (e.g., SFO, JFK).\n" 
                "1.1) City name should be full name(e.g., Paris, Seoul, San Jose, New York) of the city. If the destination_city_name is null. make sure add the name to `missing`\n" 
                "1.2) City codes use IATA city codes (e.g., PAR, NYC, LON, SEL).If the destination_city_code is null. make sure add the name to `missing`\n"
                "     • IMPORTANT: When an airport code is provided, infer the matching city name and city code instead of adding them to `missing`.\n"
                "1.3) When the user provides any airport code or clearly references a city (\"fly from Jeddah to DXB\"), you MUST infer city name and city code for that location. Example: DXB → destination_city_name = Dubai, destination_city_code = DXB; Jeddah/JED → origin_airport_code = JED without asking for more info.\n"
                "     • For metro areas with multiple airports, pick the default airport from the mapping list unless the user names a specific airport.\n"
            "2) Common mappings:\n"
            "   • \"SF\" / \"San Fran\" / \"San Francisco\" → origin_airport_code=SFO (unless clearly destination)\n"
            "   • \"Seoul\" → destination_airport_code=ICN, destination_city_name = Seoul, destination_city_code=SEL\n"
            "   • \"Paris\" → destination_airport_code=CDG (default), destination_city_name = Paris, destination_city_code=PAR\n"
            "   • \"Dubai\"/\"DXB\" → destination_airport_code=DXB, destination_city_name = Dubai, destination_city_code=DXB\n"
            "   • \"Jeddah\"/\"JED\" → airport_code=JED, city_name = Jeddah, city_code=JED\n"
            "   • \"New York\"/\"NYC\" → destination_airport_code=JFK (use JFK unless user explicitly specifies LGA/EWR), destination_city_name = New York, destination_city_code=NYC\n"
            "   • \"Washington\"/\"DC\"/\"WAS\" → airport_code=IAD (default), city_name = Washington D.C., city_code=WAS\n"
            "   • \"Chicago\"/\"CHI\" → airport_code=ORD (default), city_name = Chicago, city_code=CHI\n"
            "   • \"Los Angeles\"/\"LA\"/\"LAX\" → airport_code=LAX, city_name = Los Angeles, city_code=LAX\n"
            "   • \"Houston\"/\"HOU\" → airport_code=IAH (default), city_name = Houston, city_code=HOU\n"
            "   • \"Tokyo\"/\"TYO\" → airport_code=HND (default), city_name = Tokyo, city_code=TYO\n"
            "   • \"Toronto\"/\"YTO\" → airport_code=YYZ (default), city_name = Toronto, city_code=YTO\n"
            "   • \"Vancouver\"/\"YVR\" → airport_code=YVR, city_name = Vancouver, city_code=YVR\n"
            "   • \"Mexico City\"/\"MEX\" → airport_code=MEX, city_name = Mexico City, city_code=MEX\n"
            "   • \"London\"/\"LON\" → airport_code=LHR (default), city_name = London, city_code=LON\n"
            "3) pax:\n"
            "   • pax.adults = number of adults explicitly mentioned. If user did NOT mention number of adults explicitly, then preserve existing value OR set to 1 if no existing value. Make sure (\"wife\", \"husband\", \"Fiancée\", \"Partner\", \"Boyfriend\", \"Girlfriend\") should be counted as adult.\n"
            "   • pax.kids = number of children explicitly mentioned (\"kids\", \"children\",\"boys\",\"girls\"). If none mentioned, preserve existing value OR set to 0 if no existing value.\n"
            "4) car/hotel:\n"
            "   • **car**: \n"
            "     - Set car=true if user mentions ANY of these phrases: \"want a car\", \"need a car\", \"rent a car\", \"I want car\", \"I need car\", \"book a car\", \"car rental\", \"hire a car\", \"get a car\", or similar positive requests about cars.\n"
            "     - Set car=false ONLY if user explicitly says they DON'T need/want a car (e.g., \"no car\", \"don't need a car\", \"without a car\", \"not renting a car\").\n"
            "     - In both cases above (true or false), do NOT add car to `missing`.\n"
            "     - ONLY add car to `missing` when the user has NOT mentioned anything about cars at all AND there is no existing value (car value is null/None).\n"
            "     - IMPORTANT: After you ask about car.request, if user says \"Yes\" or \"Yap\" or any variation, this is a POSITIVE request for a car - set car.request = True.\n"
            "     - IMPORTANT: After you ask about car.request, if user says \"No\" or \"Nah\" or any variation, this is a NEGATIVE request for a car - set car.request = False.\n"
            "   • **hotel**: \n"
            # "     - Set hotel.request = True if user mentions ANY of these phrases: \"want a hotel\", \"need a hotel\", \"I want hotel\", \"I need hotel\", \"book a hotel\", \"stay in a hotel\", \"hotel accommodation\", \"find a hotel\", \"get a hotel\", \"reserve a hotel\", \"I'd like a hotel\", or similar positive requests about hotels.\n"
            "     - If hotel.request is null but hotel.amenities already has any values in Current Slots (e.g., \"breakfast\" prefilled by the app) OR the user clicks/selects any suggested-reply option that is an amenity (e.g., \"Breakfast only\", \"Breakfast + Pool\"), treat that as a positive hotel request and set hotel.request = True.\n"
            "     - Set hotel.request = False ONLY if user explicitly says they DON'T need/want a hotel (e.g., \"no hotel\", \"don't need a hotel\", \"without a hotel\", \"not staying in a hotel\", \"I have accommodation\").\n"
            "     - In both cases above (true or false), do NOT add hotel to `missing`.\n"
            "     - ONLY add hotel.request to `missing` when there is no existing value (hotel.request value is null/None) AND hotel.amenities is empty.\n"
            "     - IMPORTANT: If the user says \"I want to hotel\" or \"I want hotel\" or any variation, this is a POSITIVE request for a hotel - set hotel.request = True.\n"
            "     - IMPORTANT: After you ask about hotel.request, if user says \"Yes\" or \"Yap\" or any variation, this is a POSITIVE request for a hotel - set hotel.request = True.\n"
            "     - IMPORTANT: After you ask about hotel.request, if user says \"No\" or \"Nah\" or any variation, this is a NEGATIVE request for a hotel - set hotel.request = False.\n"
            "     - Preserve existing hotel.amenities and hotel.rating unless the user mentions changes.\n"
            "5) budget: \n"
            "   • parse numbers with symbols/abbreviations (\"$5k\" → 5000). Assume USD.\n"
            "   • If user did NOT explicitly mention budget AND there is no existing value, then add \"budget\" to `missing`.\n"
            "   • If there is an existing budget value, preserve it unless the user mentions a new budget.\n"
            "6) dates: output ISO YYYY-MM-DD. Parse ranges like \"Nov 10 to Nov 25\".\n"
            "   • IMPORTANT: Preserve existing dates.start and dates.end unless the user mentions new dates.\n"
            "7) Inference & missing:\n"
            "   • ONLY add a field to `missing` if: (1) the field is null/None AND (2) the user did NOT provide that information in the current message.\n"
            "   • DO NOT add fields to `missing` if they already have values (even if the user didn't mention them in this message).\n"
            "   • Fill only when unambiguous; otherwise preserve existing value or add to `missing` if no existing value.\n"
            "   • Do NOT invent values.\n"
            "8) attractions: If the user mentions specific activities or types of attractions (e.g., 'museums', 'Eiffel tower tour'), add them as strings to the `attractions` list. Preserve existing attractions unless user explicitly replaces them.\n"
            "9) **reply**:\n"
            "   • If there is any item in the `missing`, fill reply field to request filling the missing field in **everyday language ONE BY ONE IN ORDER OF ORIGIN, DESTINATION, DATES, PAX, BUDGET, HOTEL, CAR, ATTRACTIONS. DO NOT MENTION ALL MISSING FIELDS AT ONCE.**.\n"
            "   • Do NOT use slot field names or IATA codes. MUST use everyday language\n"
            "   • Again! ask missing field ONE BY ONE! IN ORDER OF ORIGIN, DESTINATION, DATES, PAX, BUDGET, HOTEL, CAR, ATTRACTIONS!!\n"
            "   • DO NOT STOP asking missing field if there is any item in the `missing`!\n"
            "   • If the user requests change any information already filled, change the information and fill reply field with explanation of what field was revised in everyday language.\n"
            "   • If all information is complete and user is just confirming/adding details, acknowledge the update.\n"
            "   • If user send gibberish message, respond like the following: (e.g., “Oops, you might have mis-touched!”, “Oops, maybe that was an accidental tap!”) .\n"
            "   • Thank you Message: If the user expresses gratitude, respond by thanking them as well for using TWOS"
            "10) Contextual short replies:"
            "   • If the message is very short or fragmentary, assume it answers missing/null fields."
            "   • A bare number or number + “k” (e.g., “5k”, “yes 5000”) ⇒ budget=5000 USD unless otherwise stated."
            "   • If hotel.request is null and the user says any affirmative (yes/yeah/sure/ok) ⇒ hotel.request=true; negative ⇒ false."
            "   • If car is null and the user affirms/denies, set car accordingly."
            "   • Apply the same inference to dates, pax, and amenities when they’re null and the user provides values."
            "\n"
        "Output shape:\n"
        "{\n"
        '  "current_slots": {\n'
        '    "slot_id": string|null (DO NOT include slot_id - it will be ignored),\n'
        '    "origin_airport_code": string|null,\n'
        '    "destination_airport_code": string|null,\n'
        '    "destination_city_name": string|null,\n'
        '    "destination_city_code": string|null,\n'
        '    "dates": {"start": string|null, "end": string|null},\n'
        '    "pax": {"adults": int|null, "kids": int|null},\n'
        '    "budget": number|null,\n'
        '    "hotel": {"request": true|false|null, "amenities": string[], "rating": int|null},\n'
        '    "car": true|false|null,\n'
        '    "attractions": string[]\n'
        "  },\n"
        '  "missing": ["field_name1", "field_name2"],\n'
        '  "reply": "Your response message"\n'
        "}\n"
        "\n"
        f"The current date is {current_date}.\n\n"
        "Current Slots (existing values - PRESERVE these unless user changes them):\n"
        f"{current_slots_json}\n\n"
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
        
        if not GEMINI_KEY:
            print("ERROR: GEMINI_API_KEY is not set in environment variables")
            return {"current_slots": {}, "missing": ["all"], "reply": "API configuration error. Please contact support."}
   
        response = requests.post(GEMINI_API_URL, headers=headers, json=payload, timeout=60)
        response.raise_for_status()

        response_data = response.json()
        raw_json_string = response_data['candidates'][0]['content']['parts'][0]['text']
        
        return json.loads(raw_json_string)

    except requests.RequestException as e:
        print(f"ERROR: Gemini API request failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response status: {e.response.status_code}")
            print(f"Response body: {e.response.text[:500]}")
        return {"current_slots": {}, "missing": ["all"], "reply": "Unable to process your request. Please try again."}
    except KeyError as e:
        print(f"ERROR: Unexpected Gemini API response format: {e}")
        print(f"Response data: {response_data if 'response_data' in locals() else 'N/A'}")
        return {"current_slots": {}, "missing": ["all"], "reply": "API response format error. Please try again."}
    except Exception as e:
        print(f"ERROR: Unexpected error in call_gemini: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return {"current_slots": {}, "missing": ["all"], "reply": "An unexpected error occurred. Please try again."}
