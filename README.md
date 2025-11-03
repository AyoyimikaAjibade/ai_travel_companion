# AI Travel Companion

An intelligent travel planning application that uses AI to help users create personalized travel plans through natural language conversations. The system consists of a FastAPI backend, React Native mobile frontend, and AI-powered natural language processing capabilities with Redis caching.

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
- [Project Structure](#project-structure)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 🌟 Overview

The AI Travel Companion is a modern travel planning platform that leverages artificial intelligence to simplify travel planning. Users can describe their travel preferences in natural language, and the system automatically generates comprehensive travel plans including flights, accommodations, car rentals, and activities.

## ✨ Features

### Core Features
- **AI-Powered Chat Interface**: Natural language travel planning through conversational UI
- **Intelligent Plan Generation**: Automatic travel plan generation based on user preferences
- **Plan Management**: Create, compare, and manage travel plans with AI-generated and manual options
- **Redis Caching**: Fast draft plan editing with Redis cache before final confirmation
- **User Authentication**: Secure user registration and login system
- **Chat History**: Save and manage conversation history and travel plans

### Frontend Features
- **Onboarding Experience**: Guided introduction to app features
- **Chat-based Planning**: Intuitive conversation interface for travel planning
- **Plan Comparison**: Visual comparison of travel plans with scoring
- **Chat Management**: View and manage conversation history and associated plans
- **Settings & Preferences**: Customize user experience and preferences

### Backend Features
- **RESTful API**: Comprehensive API for all travel planning operations
- **User Management**: Authentication, authorization, and user profiles with username support
- **Chat & Plan Management**: CRUD operations for chats and plans with Redis caching
- **AI Integration**: Natural language processing with Google Gemini for chat parsing and plan generation
- **Redis Cache Layer**: Draft plans and messages stored in Redis for fast editing before PostgreSQL persistence
- **Enhanced Authentication**: JWT-based auth with logout, password reset, and temporary passwords

## 🏗️ Architecture

The application follows a microservices architecture with clear separation of concerns:

- **Frontend**: React Native mobile application with Expo
- **Backend**: FastAPI Python web service with PostgreSQL database
- **AI Service**: Separate AI processing service using Google Gemini API for natural language understanding
- **Cache Layer**: Redis for storing draft plans and chat messages before final confirmation
- **Database**: PostgreSQL with SQLAlchemy ORM for persistent storage
- **Authentication**: JWT-based authentication system

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI 0.100.0+
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT with python-jose
- **Password Hashing**: bcrypt via passlib
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

### AI/ML
- **AI Provider**: Google Gemini 1.5 Flash
- **Processing**: Natural language understanding for travel planning
- **Integration**: RESTful API endpoints for AI services

## 📋 Prerequisites

Before setting up the project, ensure you have the following installed:

- **Python 3.9+** (for backend)
- **Node.js 16+** and **npm** (for frontend)
- **PostgreSQL 12+** (for database)
- **Redis 6+** (for caching draft plans and messages)
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
   ```

3. **Run the AI service** (optional - for testing)
   ```bash
   python3 -m uvicorn ai_npu:app --reload --port 8001
   ```

   The AI service will be available at:
   - **API**: http://localhost:8001
   - **Swagger UI**: http://localhost:8001/docs

## ⚙️ Environment Configuration

### Required Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost/twos_db

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
CACHE_TTL_PLANS=86400
CACHE_TTL_CHAT_MESSAGES=86400

# AI Service Configuration
AI_SERVICE_BASE_URL=http://localhost:8001

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

2. **Google Maps API Key** (optional)
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

#### User Registration Format
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Note**: `first_name` and `last_name` fields are preserved in the user model for future user settings functionality but are not required for registration.

#### Password Reset Flow
1. User requests password reset with email
2. System generates a temporary password
3. User logs in with temporary password to get access token
4. User changes password using change-password endpoint with access token

### Authentication Endpoints
- `POST /api/v1/auth/register` - User registration (requires username, email, password only)
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/password-reset-request` - Request password reset (generates temporary password)
- `POST /api/v1/auth/change-password` - Change password (requires current password)

### User Management
- `GET /api/v1/users/me` - Get current user profile
- `PUT /api/v1/users/me` - Update user profile

### AI Chat Flow
1. Frontend sends message → `/api/v1/ai/chat/parse`
2. Backend proxies to AI service → Gemini parses message and extracts slots
3. Messages saved to Redis cache for quick access
4. When all information collected → `/api/v1/ai/chat/search`
5. Plans generated → Saved to Redis cache as drafts
6. User edits plans → Updated in Redis cache
7. User confirms → `/api/v1/ai/chat/{chat_id}/confirm`
8. All data (plans and messages) saved to PostgreSQL database

### Redis Cache Structure

- **Draft Plans**: `plan:draft:{chat_id}:{slot_id}` - Plans before user confirmation
- **Chat Messages**: `messages:{chat_id}:{slot_id}` - Conversation history in cache
- **Session Data**: `session:{chat_id}:{slot_id}` - Current slots and missing fields
- **TTL**: 24 hours for all cached data

### Chat Management
- `GET /api/v1/chats/` - Get user chats
- `POST /api/v1/chats/` - Create new chat
- `GET /api/v1/chats/{chat_id}` - Get specific chat
- `GET /api/v1/chats/slot/{slot_id}` - Get chat by AI service slot_id
- `PUT /api/v1/chats/{chat_id}` - Update chat
- `DELETE /api/v1/chats/{chat_id}` - Delete chat

### Plan Management
- `GET /api/v1/plans/chat/{chat_id}` - Get plans for chat
- `POST /api/v1/plans/` - Create new plan
- `GET /api/v1/plans/{plan_id}` - Get specific plan
- `PUT /api/v1/plans/{plan_id}` - Update plan
- `DELETE /api/v1/plans/{plan_id}` - Delete plan
- `GET /api/v1/plans/chat/{chat_id}/best` - Get best scored plans
- `GET /api/v1/plans/chat/{chat_id}/ai-generated` - Get AI-generated plans
- `GET /api/v1/plans/chat/{chat_id}/manual` - Get manually edited plans

### AI Integration Endpoints
- `POST /api/v1/ai/chat/parse` - Parse user chat message with AI service
- `POST /api/v1/ai/chat/search` - Search travel options and generate plans
- `GET /api/v1/ai/chat/{chat_id}/drafts` - Get draft plans from Redis cache
- `PUT /api/v1/ai/chat/{chat_id}/drafts/{slot_id}` - Update draft plan in cache
- `POST /api/v1/ai/chat/{chat_id}/confirm` - Confirm and save plans/messages to PostgreSQL

### Health Check
- `GET /api/v1/health` - API health status
- `GET /` - Welcome message

## 📁 Project Structure

```
ai_travel_companion/
├── backend/                    # FastAPI backend service
│   ├── api/v1/                # API endpoints
│   │   ├── auth.py           # Authentication endpoints
│   │   ├── users.py          # User management
│   │   ├── chats.py          # Chat management
│   │   ├── plans.py           # Plan management
│   │   └── ai_integration.py  # AI service integration
│   ├── core/                 # Core configuration
│   │   ├── config.py         # Application settings
│   │   ├── database.py       # Database configuration
│   │   ├── security.py       # Authentication & security
│   │   └── cache.py          # Redis cache operations
│   ├── models/               # SQLAlchemy models
│   │   ├── user.py          # User model
│   │   ├── chat.py          # Chat model
│   │   ├── plan.py          # Plan model
│   │   └── chat_message.py  # Chat message model
│   ├── repositories/         # Data access layer
│   ├── services/            # Business logic layer
│   ├── schemas/             # Pydantic schemas
│   └── main.py             # FastAPI application entry point
├── frontend/                # React Native mobile app
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── screens/         # App screens
│   │   │   ├── SplashScreen.js
│   │   │   ├── OnboardingScreen.js
│   │   │   ├── ChatScreen.js
│   │   │   ├── PlansScreen.js
│   │   │   ├── MyChatsScreen.js
│   │   │   └── SettingsScreen.js
│   │   ├── hooks/           # Custom React hooks
│   │   ├── stores/          # State management
│   │   ├── lib/            # Utility functions
│   │   └── theme/          # Theme configuration
│   ├── assets/             # Static assets
│   └── package.json        # Frontend dependencies
├── ai/                     # AI service
│   └── ai_npu.py          # Natural language processing
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

2. **Frontend Development**
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
2. Import `AI_Travel_Companion_Environment.json`
3. Set up environment variables
4. Run the collection

## 🚀 Deployment

### Using Docker (Recommended)

1. **Create Dockerfile for Backend**
   ```dockerfile
   FROM python:3.9-slim
   
   WORKDIR /app
   
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   
   COPY backend/ .
   
   EXPOSE 8000
   
   CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
   ```

2. **Create docker-compose.yml**
   ```yaml
   version: '3.8'
   
   services:
     db:
       image: postgres:13
       environment:
         POSTGRES_DB: twos_db
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: postgres
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
     redis:
       image: redis:7-alpine
       ports:
         - "6379:6379"
       volumes:
         - redis_data:/data
   
     backend:
       build: .
       ports:
         - "8000:8000"
       depends_on:
         - db
         - redis
       environment:
         DATABASE_URL: postgresql://postgres:postgres@db:5432/twos_db
         REDIS_HOST: redis
         REDIS_PORT: 6379
       volumes:
         - ./backend:/app
   
   volumes:
     postgres_data:
     redis_data:
   ```

3. **Deploy**
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

3. **Deploy Frontend**
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

---

**Happy Traveling! ✈️**