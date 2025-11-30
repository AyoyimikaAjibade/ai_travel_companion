import os
from pathlib import Path
from dotenv import load_dotenv, find_dotenv

# Try current working dir first; if not found, load the one next to ai_npu.py (project root)
loaded = load_dotenv(find_dotenv())
if not loaded:
    project_root = Path(__file__).resolve().parents[1]  # .../ai/
    load_dotenv(project_root / ".env")

# API Keys
GEMINI_KEY   = os.getenv("GEMINI_API_KEY")
AMADEUS_KEY  = os.getenv("AMADEUS_API_KEY")
AMADEUS_SECRET = os.getenv("AMADEUS_API_SECRET")
EXPEDIA_KEY  = os.getenv("EXPEDIA_API_KEY")
BOOKING_KEY  = os.getenv("BOOKING_API_KEY")
TIQETS_KEY   = os.getenv("TIQETS_API_KEY")

# Base URLs
AMADEUS_URL  = "https://test.api.amadeus.com"
EXPEDIA_URL  = "https://api.expediagroup.com/rapid/v3"
BOOKING_URL  = "https://distribution-xml.booking.com/2.9"
TIQETS_URL   = "https://api.tiqets.com/v2"

# Backend Service URL for persistence
BACKEND_SERVICE_BASE_URL = os.getenv("BACKEND_SERVICE_BASE_URL", "http://backend:8001")
