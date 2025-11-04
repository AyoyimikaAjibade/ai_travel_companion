# AI Service Setup Guide

This guide will help you set up and run the AI service that handles natural language processing and travel search integration.

## 📋 Prerequisites

- **Python 3.9+**
- **GEMINI_API_KEY** - Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **AMADEUS_API_KEY** and **AMADEUS_API_SECRET** - Get from [Amadeus for Developers](https://developers.amadeus.com/)

## 🚀 Quick Setup

### 1. Navigate to AI Directory
```bash
cd ai
```

### 2. Create Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -U fastapi uvicorn python-dotenv requests ulid-py pydantic
```

Or install from a requirements file (if created):
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file in the `ai/` directory:

```env
# Gemini API (Required)
GEMINI_API_KEY=your-gemini-api-key-here

# Amadeus API (Required for flight/hotel searches)
AMADEUS_API_KEY=your-amadeus-api-key-here
AMADEUS_API_SECRET=your-amadeus-api-secret-here

# Optional - Other API Keys
EXPEDIA_API_KEY=your-expedia-key
BOOKING_API_KEY=your-booking-key
TIQETS_API_KEY=your-tiqets-key
```

### 5. Run the AI Service

```bash
python3 -m uvicorn ai_npu:app --reload --host 0.0.0.0 --port 8001
```

The service will be available at:
- **API**: http://localhost:8001
- **Swagger UI**: http://localhost:8001/docs
- **Health Check**: http://localhost:8001/health

## 🧪 Testing the Service

### Health Check
```bash
curl http://localhost:8001/health
```

Expected response:
```json
{"Live": true, "mode": "AI"}
```

### Test Chat Parsing
```bash
curl -X POST http://localhost:8001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I want to fly from San Francisco to Paris from November 10 to November 20 for 2 adults",
    "current_slots": null
  }'
```

### Test Search (requires complete slots)
```bash
curl -X POST http://localhost:8001/search \
  -H "Content-Type: application/json" \
  -d '{
    "slot_id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
    "origin_airport_code": "SFO",
    "destination_airport_code": "CDG",
    "destination_city_code": "PAR",
    "dates": {"start": "2024-11-10", "end": "2024-11-20"},
    "pax": {"adults": 2, "kids": 0},
    "budget": 5000,
    "hotel": {"request": true, "amenities": [], "rating": 4}
  }'
```

## 🔗 Integration with Backend

The backend service is configured to call the AI service at `AI_SERVICE_BASE_URL` (default: `http://localhost:8001`).

### Backend Configuration

In `backend/core/config.py`:
```python
AI_SERVICE_BASE_URL: str = os.getenv("AI_SERVICE_BASE_URL", "http://localhost:8001")
```

Make sure this matches your AI service URL.

### Testing Backend → AI Service Connection

1. **Start the AI service** (on port 8001)
2. **Start the backend service** (on port 8000)
3. **Make a request to backend AI integration endpoint**:

```bash
curl -X POST http://localhost:8000/api/v1/ai/chat/parse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "message": "I want to fly from San Francisco to Paris",
    "current_slots": null
  }'
```

## 🐳 Docker Setup (Optional)

### Build Docker Image
```bash
docker build -f Dockerfile.ai -t ai-service .
```

### Run Docker Container
```bash
docker run -d \
  --name ai-service \
  -p 8001:8001 \
  --env-file .env \
  ai-service
```

## 🔍 Troubleshooting

### Service Not Starting
- Check if port 8001 is already in use
- Verify Python version (3.9+)
- Check virtual environment is activated

### API Keys Not Working
- Verify `.env` file is in the `ai/` directory
- Check API keys are correctly set (no extra spaces)
- For Gemini: Ensure API key is active in Google AI Studio
- For Amadeus: Verify you're using test API credentials

### Connection Errors from Backend
- Verify AI service is running on the correct port
- Check `AI_SERVICE_BASE_URL` in backend config
- Ensure no firewall blocking connection between services

### Gemini API Errors
- Check API key quota/limits in Google AI Studio
- Verify model name is correct (gemini-2.0-flash)
- Review error messages in AI service logs

## 📚 API Endpoints

### POST /chat
Parse user's natural language message and extract travel information.

**Request:**
```json
{
  "message": "I want to fly from SFO to Paris",
  "current_slots": null
}
```

**Response:**
```json
{
  "current_slots": {
    "slot_id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
    "origin_airport_code": "SFO",
    "destination_airport_code": "CDG",
    ...
  },
  "missing": ["dates", "pax", "budget"]
}
```

### POST /search
Search for flights, hotels, and attractions based on complete slots.

**Request:**
```json
{
  "slot_id": "...",
  "origin_airport_code": "SFO",
  "destination_airport_code": "CDG",
  "dates": {"start": "2024-11-10", "end": "2024-11-20"},
  "pax": {"adults": 2},
  "budget": 5000
}
```

**Response:**
```json
{
  "flight": {
    "airline": "Air France",
    "price": 850.00,
    ...
  },
  "hotel": {
    "name": "Hotel Name",
    "total_price": 1200.00,
    ...
  },
  "attractions": [...]
}
```

## 🔄 Development Workflow

1. **Start AI service** in terminal 1:
   ```bash
   cd ai
   source venv/bin/activate
   python3 -m uvicorn ai_npu:app --reload --host 0.0.0.0 --port 8001
   ```

2. **Start backend service** in terminal 2:
   ```bash
   cd backend
   source twos_venv/bin/activate
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Test integration** using Postman or curl

## 📝 Notes

- The AI service runs on port **8001** by default
- The backend service runs on port **8000** by default
- Ensure both services can communicate (same network/localhost)
- AI service must be running before backend can use it
- API keys are required for the AI service to function

