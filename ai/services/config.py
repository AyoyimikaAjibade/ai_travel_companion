import os
from dotenv import load_dotenv

load_dotenv()

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
