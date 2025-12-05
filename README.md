# AI Travel Companion

An intelligent travel planning application that uses AI to help users create personalized travel plans through natural language conversations. The system consists of a FastAPI backend, React Native mobile frontend, and AI-powered natural language processing capabilities.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [AI Service Setup](#ai-service-setup)
- [Environment Configuration](#environment-configuration)
- [API Documentation](#api-documentation)
- [AI Service Integration](#ai-service-integration)
- [Project Structure](#project-structure)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 🌟 Overview

The AI Travel Companion is a modern travel planning platform that leverages artificial intelligence to simplify travel planning. Users can describe their travel preferences in natural language, and the system automatically generates comprehensive travel plans including flights, accommodations, car rentals, and activities.

### Key Capabilities

- **Natural Language Processing**: Uses Google Gemini 2.0 Flash to parse user messages into structured travel data
- **Automatic Travel Search**: Integrates with Amadeus APIs to find flights, hotels, attractions, and cars
- **Conversation Management**: Tracks user interactions using `slot_id` (ULID) for session continuity
- **Plan Generation**: Automatically generates travel plans when all required information is collected
- **Direct Persistence**: All chat messages and plans are saved directly to PostgreSQL database

## ✨ Features

### Core Features
- **AI-Powered Chat Interface**: Natural language travel planning through conversational UI
- **Intelligent Plan Generation**: Automatic travel plan generation based on user preferences
- **Plan Management**: Create, view, and manage travel plans with AI-generated options
- **User Authentication**: Secure user registration and login system with JWT tokens
- **Chat History**: Save and manage conversation history and travel plans
- **Session Continuity**: Track conversations across multiple messages and devices using slot_id

### Frontend Features
- **Onboarding Experience**: Guided introduction to app features
- **Chat-based Planning**: Intuitive conversation interface for travel planning
- **Plan Comparison**: Visual comparison of travel plans with scoring
- **Chat Management**: View and manage conversation history and associated plans
- **Settings & Preferences**: Customize user experience and preferences

### Backend Features
- **RESTful API**: Comprehensive API for all travel planning operations
- **User Management**: Authentication, authorization, and user profiles
- **Chat & Plan Management**: CRUD operations for chats and plans
- **AI Integration**: Natural language processing with Google Gemini for chat parsing and plan generation
- **Enhanced Authentication**: JWT-based auth with logout, password reset, and temporary passwords
- **Error Handling**: Comprehensive error handling with proper HTTP status codes and logging

## 🏗️ Architecture

The application follows a microservices architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React Native)                  │
│                    Expo SDK 53, React Navigation            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTP/REST API
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              AI Service (Entry Point - FastAPI)             │
│              Port 8000                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   FastAPI    │───▶│   Models     │───▶│   Services  │ │
│  │  Endpoints   │    │  (Pydantic)  │    │  (Business  │ │
│  │   /chat      │    │              │    │   Logic)    │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│         │                    │                    │       │
│         └────────────────────┼────────────────────┘       │
│                              │                            │
│  ┌───────────────────────────┴───────────────────────────┐ │
│  │              External API Integrations               │ │
│  ├──────────────────┬──────────────────┬─────────────────┤ │
│  │  Google Gemini   │   Amadeus APIs   │   Mock Data     │ │
│  │  (NLP Parsing)   │  (Travel Search) │  (Car Rental)   │ │
│  └──────────────────┴──────────────────┴─────────────────┘ │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTP/REST API (Persistence)
                        │ POST /api/v1/ai/persist-chat
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              Backend Service (Persistence - FastAPI)        │
│              Port 8001                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   API Layer  │  │  Service     │  │ Repository   │      │
│  │  (Endpoints) │─▶│  (Business   │─▶│  (Data Access)│      │
│  │              │  │   Logic)     │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                    │          │
│         └──────────────────┼────────────────────┘          │
│                            │                               │
│  ┌─────────────────────────┴───────────────────────────┐  │
│  │              PostgreSQL Database                      │  │
│  │  (Users, Chats, Plans, ChatMessages)                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Components

- **Frontend**: React Native mobile application with Expo
- **AI Service**: Entry point service (Port 8000) using Google Gemini API for natural language understanding and travel search
- **Backend**: Persistence service (Port 8001) with FastAPI and PostgreSQL database for data management
- **Database**: PostgreSQL with SQLAlchemy ORM for persistent storage
- **Authentication**: JWT-based authentication system (optional for chat, required for viewing saved chats/plans)

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI 0.100.0+
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT with python-jose
- **Password Hashing**: bcrypt via passlib
- **HTTP Client**: httpx for async API calls
- **Testing**: pytest with async support
- **Code Quality**: pylint, black, isort, mypy
- **Migration**: Alembic

### Frontend
- **Framework**: React Native with Expo SDK 53
- **Navigation**: React Navigation 7
- **State Management**: Zustand
- **HTTP Client**: Axios
- **UI Components**: Custom components with Lucide icons
- **Animations**: Lottie React Native

### AI Service
- **Framework**: FastAPI 0.100.0+
- **AI/NLP**: Google Gemini 2.0 Flash
- **Travel APIs**: Amadeus for Developers
- **Data Validation**: Pydantic v2
- **Session IDs**: ULID (Universally Unique Lexicographically Sortable Identifier)
- **Runtime**: Python 3.9+, Uvicorn ASGI server

## 📋 Prerequisites

Before setting up the project, ensure you have the following installed:

- **Python 3.9+** (for backend and AI service)
- **Node.js 16+** and **npm** (for frontend)
- **PostgreSQL 12+** (for database)
- **Git** (for version control)
- **Expo CLI** (for React Native development)

### Optional but Recommended
- **Docker** (for containerized deployment)
- **Postman** (for API testing)

## 🚀 Installation & Setup

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai_travel_companion
   ```

2. **Create and activate virtual environment**
   ```bash
   cd backend
   python3 -m venv twos_venv
   source twos_venv/bin/activate  # On Windows: twos_venv\Scripts\activate
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r ../requirements.txt
   ```

4. **Set up PostgreSQL database**
   ```bash
   # Connect to Postgres (from your host, if you have psql installed)
   psql -U <username>

   # Then in the psql prompt:
   CREATE DATABASE twos_db;
   \q
   ```

5. **Configure environment variables**
   Create a `.env` file in the backend directory:
   ```env
   # Database
   DATABASE_URL=postgresql://username:password@localhost/twos_db
   
   # Security
   SECRET_KEY=your-super-secret-key-change-in-production
   JWT_SECRET_KEY=your-jwt-secret-key
   
   # Server
   SERVER_HOST=0.0.0.0
   SERVER_PORT=8000
   DEBUG=true
   ENVIRONMENT=development
   
   # CORS
   CORS_ORIGINS=http://localhost:3000,http://localhost:8000,http://localhost:19006
   
   # Backend Service Configuration (for AI service to persist data)
   BACKEND_SERVICE_BASE_URL=http://localhost:8001
   
   # External APIs
   GEMINI_API_KEY=your-gemini-api-key
   GOOGLE_MAPS_API_KEY=your-google-maps-api-key
   ```

6. **Initialize database**
   ```bash
   python main.py
   # This will create all necessary tables
   ```

7. **Run the backend server**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

   The API will be available at:
   - **API**: http://localhost:8000
   - **Swagger UI**: http://localhost:8000/docs
   - **ReDoc**: http://localhost:8000/redoc

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API endpoint**
   Update the API base URL in `src/lib/api.js` if needed:
   ```javascript
   const API_BASE_URL = 'http://localhost:8000/api/v1';
   ```

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on device/simulator**
   - **iOS Simulator**: Press `i` in the terminal
   - **Android Emulator**: Press `a` in the terminal
   - **Physical Device**: Scan QR code with Expo Go app

### AI Service Setup

1. **Navigate to AI directory**
   ```bash
   cd ../ai
   ```

2. **Set up environment variables**
   Ensure your `.env` file includes:
   ```env
   GEMINI_API_KEY=your-gemini-api-key
   AMADEUS_API_KEY=your-amadeus-api-key
   AMADEUS_API_SECRET=your-amadeus-api-secret
   ```

3. **Run the AI service (Entry Point - Port 8000)**
   ```bash
   python3 -m uvicorn ai_npu:app --reload --port 8000
   ```

   The AI service will be available at:
   - **API**: http://localhost:8000
   - **Swagger UI**: http://localhost:8000/docs
   
   **Note**: The AI service calls the backend service (port 8001) to persist chat data.

## ⚙️ Environment Configuration

### Required Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost/twos_db

# Backend Service Configuration (for AI service persistence)
BACKEND_SERVICE_BASE_URL=http://localhost:8001

# Security Settings
SECRET_KEY=your-super-secret-key-change-in-production
JWT_SECRET_KEY=your-jwt-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=480
REFRESH_TOKEN_EXPIRE_DAYS=30

# Server Configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
DEBUG=true
ENVIRONMENT=development
WORKERS=1

# CORS Settings
CORS_ORIGINS=http://localhost:3000,http://localhost:8000,http://localhost:19006

# External API Keys
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
WEATHER_API_KEY=your-weather-api-key

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_TLS=true
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAILS_FROM_EMAIL=your-email@gmail.com
EMAILS_FROM_NAME=AI Travel Companion

# File Upload Settings
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16777216

# Rate Limiting
RATE_LIMIT=100/minute

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/app.log
```

### API Keys Setup

1. **Google Gemini API Key**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Add to your `.env` file

2. **Amadeus API Keys** (for AI service)
   - Visit [Amadeus for Developers](https://developers.amadeus.com/)
   - Create a new app
   - Get API key and secret
   - Add to AI service `.env` file

3. **Google Maps API Key** (optional)
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Maps JavaScript API
   - Create credentials and add to `.env` file

## 📚 API Documentation

### Authentication System

The application uses JWT-based authentication with the following features:

- **User Registration**: Requires username (unique), email (unique), and password
- **Login**: Uses email/username and password to generate access and refresh tokens
- **Token Management**: Access tokens expire in 8 hours, refresh tokens in 30 days
- **Logout**: Server-side logout tracking for audit purposes
- **Password Reset**: Generates temporary passwords for secure password recovery
- **Password Change**: Allows users to change passwords with current password verification
- **Optional Authentication**: Chat with AI service is available without authentication (anonymous chats), but viewing saved chats/plans requires authentication

#### User Registration Format
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

### Authentication Endpoints
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/password-reset-request` - Request password reset
- `POST /api/v1/auth/change-password` - Change password

**Note**: Chat endpoints work without authentication (anonymous mode), but viewing saved chats/plans requires authentication.

### User Management
- `GET /api/v1/users/me` - Get current user profile
- `PUT /api/v1/users/me` - Update user profile

### Chat Management
- `GET /api/v1/chats/` - Get user chats
- `GET /api/v1/chats/{chat_id}` - Get specific chat
- `GET /api/v1/chats/slot/{slot_id}` - Get chat by AI service slot_id
- `POST /api/v1/chats/{chat_id}/cancel` - Cancel chat booking
- `DELETE /api/v1/chats/{chat_id}` - Delete chat
- `GET /api/v1/chats/{chat_id}/messages` - Get chat messages (includes chat_status)
- `GET /api/v1/chats/slot/{slot_id}/messages` - Get messages by slot_id

**Chat Status Values:**
- `draft` - Initial state when chat is created
- `booked` - Booking has been confirmed
- `confirmed` - Booking is confirmed
- `cancelled` - Booking has been cancelled
- `null` - No status set

### Plan Management
- `GET /api/v1/plans/chat/{chat_id}` - Get plans for chat (includes chat_status)
- `GET /api/v1/plans/{plan_id}` - Get specific plan (includes chat_status)
- `DELETE /api/v1/plans/{plan_id}` - Delete plan

### AI Integration Endpoints
- `POST /chat` - Chat with AI service (on AI service at port 8000)
- `POST /api/v1/ai/persist-chat` - Persist chat data (internal, called by AI service)

### Health Check
- `GET /api/v1/health` - API health status
- `GET /` - Welcome message

## 🤖 AI Service Integration

### Overview

The AI service is the **entry point** (Port 8000) that handles:
- **Natural Language Processing (NLP)**: Uses Google Gemini to parse user messages into structured travel data
- **Travel Search Integration**: Calls Amadeus APIs to find flights, hotels, attractions, and cars
- **Conversation Management**: Tracks user interactions using `slot_id` (ULID) for session continuity
- **Plan Generation**: Automatically generates travel plans when all required information is collected
- **Data Persistence**: Automatically calls backend service to save chats, messages, and plans

### AI Service Architecture

```
AI Service (Port 8000 - Entry Point)
    │
    ├─▶ POST /chat - Main chat endpoint
    │   ├─▶ Accepts optional user_id, chat_id for authenticated users
    │   ├─▶ Parses user message with Gemini
    │   ├─▶ Merges with previous slots (preserves slot_id)
    │   ├─▶ If complete: Searches travel options
    │   │   ├─▶ Amadeus Flight Offers API
    │   │   ├─▶ Amadeus Hotel Offers API
    │   │   ├─▶ Amadeus Activities API
    │   │   └─▶ Mock Car Rental (future: Amadeus Car API)
    │   ├─▶ Returns ParseResponse or TravelOptionsResponse immediately
    │   └─▶ Calls Backend Service to persist data (non-blocking)
    │       └─▶ POST /api/v1/ai/persist-chat
    │           ├─▶ Creates/updates Chat by slot_id
    │           ├─▶ Saves ChatMessage (user + AI reply)
    │           └─▶ Creates Plan (if complete plan generated)
    │
    └─▶ GET /health - Health check
```

### Data Flow

#### 1. User Message Flow

```
User: "I want to fly from SF to Paris"
    │
    ▼
Frontend → AI Service: POST /chat (Port 8000)
    {
      "message": "I want to fly from SF to Paris",
      "current_slots": null,
      "user_id": "optional-uuid",  // Optional for authenticated users
      "chat_id": null
    }
    │
    ▼
AI Service:
    1. Creates new Slots (auto-assigns slot_id)
    2. Calls Gemini → parses message
    3. Merges parsed slots
    4. Checks missing fields
    5. Returns ParseResponse immediately (missing: ["dates", "pax", "budget"])
    │
    ├─▶ Response sent to Frontend immediately
    │   {
    │     "current_slots": {...},
    │     "missing": ["dates", "pax", "budget"],
    │     "reply": "I need to know your travel dates...",
    │     "slot_id": "..."
    │   }
    │
    └─▶ AI Service → Backend: POST /api/v1/ai/persist-chat (non-blocking)
        {
          "slot_id": "...",
          "user_id": "...",
          "message": "...",
          "returned_slots": {...},
          "ai_response": {...},
          "is_complete_plan": false
        }
        │
        ▼
        Backend:
        1. Finds/Creates Chat by slot_id
        2. Updates Chat with latest slots data
        3. Saves user message to ChatMessage
        4. Saves AI reply to ChatMessage
```

#### 2. Complete Information Flow (Plan Generation)

```
User: "From Nov 10 to Nov 20, 2 adults, budget $5k, need hotel and car"
    │
    ▼
Frontend → AI Service: POST /chat (Port 8000)
    {
      "message": "From Nov 10 to Nov 20, 2 adults, budget $5k, need hotel and car",
      "current_slots": { "slot_id": "...", ... },
      "user_id": "optional-uuid"
    }
    │
    ▼
AI Service:
    1. Calls Gemini → parses message
    2. Merges parsed slots (preserves slot_id)
    3. Checks missing fields → empty!
    4. Generates plan_id (ULID)
    5. Searches flights → finds cheapest
    6. Searches hotels → finds cheapest
    7. Searches attractions → finds top 3
    8. Searches car → finds recommended
    9. Returns TravelOptionsResponse immediately
    │
    ├─▶ Response sent to Frontend immediately
    │   {
    │     "plan_id": "...",
    │     "slot_id": "...",
    │     "flight": {...},
    │     "hotel": {...},
    │     "car": {...},
    │     "attractions": [...],
    │     "reply": "OK. I have updated your travel information."
    │   }
    │
    └─▶ AI Service → Backend: POST /api/v1/ai/persist-chat (non-blocking)
        {
          "slot_id": "...",
          "user_id": "...",
          "message": "...",
          "returned_slots": {...},
          "ai_response": {...},
          "is_complete_plan": true
        }
        │
        ▼
        Backend:
        1. Finds Chat by slot_id (or creates new if not exists)
        2. Updates Chat with latest slots data
        3. Saves user message to ChatMessage
        4. Saves AI reply to ChatMessage
        5. Creates NEW Plan record (tracks multiple plans per chat)
```

### Session Management

**Slot ID Tracking** (Primary Identifier):
- AI service generates `slot_id` (ULID) on first request
- Backend stores `slot_id` in `Chat.slot_id` and `ChatMessage.slot_id`
- Frontend sends `slot_id` in subsequent requests
- AI service preserves `slot_id` across messages (merges slots)
- **Chat lookup by slot_id**: Backend finds/updates chat by `slot_id` (same `slot_id` = same conversation)

**Chat ID Tracking** (Internal):
- Backend generates `chat_id` (UUID) when creating `Chat` record
- Backend links `ChatMessage` and `Plan` records to `Chat`
- Chat lookup is done by `slot_id` - no need to send `chat_id` from frontend

**User ID Tracking** (Optional):
- Authenticated users can pass `user_id` in chat request
- Anonymous chats have `user_id = null`
- Chats are viewable only by authenticated users who own them
- Anonymous chats can be upgraded to authenticated when user logs in

### AI Service Models

#### Slots Model
The main travel information container that tracks:
- `slot_id`: Auto-generated ULID for session tracking
- `origin_airport_code`: IATA code (e.g., "SFO")
- `destination_airport_code`: IATA code (e.g., "CDG")
- `destination_city_name`: Full name (e.g., "Paris")
- `dates`: Start and end dates (ISO format)
- `pax`: Adults and kids count
- `budget`: Total budget in USD
- `hotel`: Hotel preferences (request, amenities, rating)
- `car`: Boolean for rental car need
- `attractions`: List of attraction interests

#### Response Types
- **ParseResponse**: Returned when information is incomplete (asks for clarification)
- **TravelOptionsResponse**: Returned when all information is complete (returns travel plan)

### External API Integrations

1. **Google Gemini API**
   - Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
   - Purpose: Natural language parsing with JSON mode
   - Authentication: API key (`GEMINI_API_KEY`)

2. **Amadeus for Developers**
   - Base URL: `https://test.api.amadeus.com` (test environment)
   - Endpoints:
     - `/v1/security/oauth2/token` - Get access token
     - `/v2/shopping/flight-offers` - Search flights
     - `/v3/shopping/hotel-offers` - Search hotels
     - `/v1/shopping/activities` - Search attractions
   - Authentication: OAuth2 client credentials (`AMADEUS_API_KEY`, `AMADEUS_API_SECRET`)

3. **Mock Car Rental API**
   - Currently uses JSON file for car recommendations
   - Future: Integrate with Amadeus Car Rental API

## 📁 Project Structure

```
ai_travel_companion/
├── backend/                    # FastAPI backend service
│   ├── api/v1/                # API endpoints
│   │   ├── auth.py           # Authentication endpoints
│   │   ├── users.py          # User management
│   │   ├── chats.py          # Chat management
│   │   ├── chat_messages.py  # Chat message endpoints
│   │   ├── plans.py           # Plan management
│   │   └── ai_integration.py  # AI service integration
│   ├── core/                 # Core configuration
│   │   ├── config.py         # Application settings
│   │   ├── database.py       # Database configuration
│   │   └── security.py       # Authentication & security
│   ├── models/               # SQLAlchemy models
│   │   ├── user.py          # User model
│   │   ├── chat.py          # Chat model
│   │   ├── plan.py          # Plan model
│   │   └── chat_message.py  # Chat message model
│   ├── repositories/         # Data access layer
│   ├── services/            # Business logic layer
│   └── main.py             # FastAPI application entry point
├── frontend/                # React Native mobile app
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── screens/         # App screens
│   │   ├── hooks/           # Custom React hooks
│   │   ├── stores/          # State management
│   │   ├── lib/            # Utility functions
│   │   └── theme/          # Theme configuration
│   ├── assets/             # Static assets
│   └── package.json        # Frontend dependencies
├── ai/                     # AI service
│   ├── ai_npu.py          # Main AI service (FastAPI app)
│   ├── api_services.py    # External API integrations
│   └── base_models.py     # Pydantic models
├── postman/               # API testing collection
├── requirements.txt       # Python dependencies
└── README.md             # This file
```

## 💻 Development

### Running in Development Mode

1. **Backend Development**
   ```bash
   cd backend
   source twos_venv/bin/activate
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **AI Service Development** (Entry Point - Port 8000)
   ```bash
   cd ai
   python3 -m uvicorn ai_npu:app --reload --port 8000
   ```
   
   **Note**: Ensure backend service is running on port 8001 for persistence.

3. **Frontend Development**
   ```bash
   cd frontend
   npm start
   # or
   npx expo start
   ```

### Code Quality

The project includes several code quality tools:

```bash
# Format code
black backend/
isort backend/

# Lint code
pylint backend/

# Type checking
mypy backend/

# Run all quality checks
pre-commit run --all-files
```

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Downgrade migration
alembic downgrade -1
```

## 🧪 Testing

### Backend Testing

```bash
cd backend
pytest tests/ -v --cov=.
```

### Frontend Testing

```bash
cd frontend
npm test
```

### API Testing

Use the provided Postman collection in the `postman/` directory:

1. Import `AI_Travel_Companion_Collection.json`
2. Set up environment variables
3. Run the collection

## 🚀 Deployment

### Using Docker (Recommended)

1. **Create docker-compose.yml** (already included)
   ```yaml
   version: '3.8'
   
   services:
     db:
       image: postgres:13-alpine
       # ... database configuration
   
     backend:
       build:
         context: .
         dockerfile: Dockerfile
       # ... backend configuration
   
     ai_service:
       build:
         context: ./ai
         dockerfile: Dockerfile.ai
       # ... AI service configuration
   ```

2. **Deploy**
   ```bash
   docker-compose up -d
   ```

### Manual Deployment

1. **Prepare Production Environment**
   - Set up PostgreSQL database
   - Configure environment variables
   - Install Python dependencies

2. **Deploy Backend**
   ```bash
   gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

3. **Deploy AI Service** (Entry Point - Port 8000)
   ```bash
   gunicorn ai_npu:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
   ```
   
   **Note**: Ensure backend service is running on port 8001 for persistence.

4. **Deploy Frontend**
   ```bash
   expo build:android
   expo build:ios
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow PEP 8 for Python code
- Use ESLint and Prettier for JavaScript/React Native code
- Write tests for new features
- Update documentation for API changes
- Use conventional commit messages

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue on GitHub
- Check the [API documentation](http://localhost:8000/docs)
- Review the Postman collection for API examples

## 🔮 Future Enhancements

- Real-time notifications
- Offline mode support
- Advanced AI recommendations
- Social features (chat/plan sharing)
- Integration with more travel booking platforms
- Multi-language support
- Car rental API integration (replace mock)
- Multiple travel option results (not just cheapest)
- Budget optimization across components

---

**Happy Traveling! ✈️**
