# -------------------------------------------------------------------
# To test API endpoints
# 1. Get you Gemini API key and copy to .env file
# 2. pip3 install uvicorn fastapi python-dotenv google-generativeai
# 3. python3 -m uvicorn ai_npu:app --reload
# 4. Swagger UI: http://127.0.0.1:8000/docs
# -------------------------------------------------------------------

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List,Optional,Dict
from dotenv import load_dotenv
from datetime import datetime, timedelta
import os
import json
import traceback
import google.generativeai as gemini
#import openai
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from auth import (
    UserCreate, Token, UserInDB, fake_users_db, get_password_hash,
    authenticate_user, create_access_token, create_refresh_token,
    ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS,
    get_current_active_user, get_user
)

load_dotenv()
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
gemini.configure(api_key=GEMINI_KEY)

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

# Slots to track
class Slots(BaseModel):
    origin: Optional[str] = None
    destination: Optional[str] = None
    dates: Dates = Dates()
    pax: Optional[int] = None   #Number of travelers
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
                    "pax": 1,
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

    try:
        AI_model = gemini.GenerativeModel("gemini-1.5-flash", generation_config={"response_mime_type":"application/json"})
        response = AI_model.generate_content(prompt)

        raw_json_string = response.text

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

@app.post("/register", response_model=UserInDB)
async def register(user: UserCreate):
    if user.email in fake_users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = UserInDB(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name
    )
    fake_users_db[user.email] = db_user
    return db_user

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        data={"sub": user.email}, expires_delta=refresh_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token
    }

@app.post("/token/refresh", response_model=Token)
async def refresh_token(refresh_token: str):
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=400, detail="Invalid token type")
        
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=400, detail="Invalid token")
            
        user = get_user(fake_users_db, email)
        if user is None:
            raise HTTPException(status_code=400, detail="User not found")
            
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        new_access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        
        return {
            "access_token": new_access_token,
            "token_type": "bearer",
            "refresh_token": refresh_token
        }
        
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid token")

@app.post("/password/reset-request")
async def request_password_reset(email: str):
    # In a real application, you would send an email with a reset token
    # This is a simplified version that just returns a reset token
    user = get_user(fake_users_db, email)
    if user is None:
        # Don't reveal that the user doesn't exist
        return {"message": "If your email is registered, you'll receive a password reset link"}
        
    reset_token = create_access_token(
        data={"sub": user.email, "purpose": "reset"},
        expires_delta=timedelta(hours=1)
    )
    
    # In a real app, send an email with the reset token
    return {"message": "If your email is registered, you'll receive a password reset link"}

@app.post("/password/reset")
async def reset_password(token: str, new_password: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("purpose") != "reset":
            raise HTTPException(status_code=400, detail="Invalid token")
            
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=400, detail="Invalid token")
            
        user = get_user(fake_users_db, email)
        if user is None:
            raise HTTPException(status_code=400, detail="User not found")
            
        # Update the user's password
        hashed_password = get_password_hash(new_password)
        user.hashed_password = hashed_password
        fake_users_db[email] = user
        
        return {"message": "Password updated successfully"}
        
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

@app.get("/me")
async def read_users_me(current_user: UserInDB = Depends(get_current_active_user)):
    return current_user

@app.get("/")
def root():
    return {"message": "Welcome to the TWOS!"}

# To test the service is alive
@app.get("/health")
def health():
    return {"Live": True, "mode": "AI"}

# Parse the user's request (natural language text)
@app.post("/nlu/parse", response_model = ParseResponse)
async def parse(
    request: Request,
    current_user: UserInDB = Depends(get_current_active_user)
):
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
async def clarify(
    request: ClarifyRequest,
    current_user: UserInDB = Depends(get_current_active_user)
):

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