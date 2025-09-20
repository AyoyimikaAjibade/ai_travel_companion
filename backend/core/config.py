import os
from typing import Optional, List
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    # Application settings
    PROJECT_NAME: str = "AI Travel Companion API"
    API_V1_STR: str = "/api/v1"
    API_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Server settings
    SERVER_HOST: str = os.getenv("SERVER_HOST", "0.0.0.0")
    SERVER_PORT: int = int(os.getenv("SERVER_PORT", "8000"))
    WORKERS: int = int(os.getenv("WORKERS", "1"))
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", os.getenv("SECRET_KEY", "your-jwt-secret-key"))
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # 8 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
    
    # CORS - Parse from environment or use defaults
    @property
    def BACKEND_CORS_ORIGINS(self) -> List[str]:
        cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8000")
        return [origin.strip() for origin in cors_origins.split(",")]
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://ayoyimikaajibade:postgres@localhost/twos_db"
    )
    
    # Email settings (for password reset, notifications, etc.)
    SMTP_TLS: bool = os.getenv("SMTP_TLS", "true").lower() == "true"
    SMTP_PORT: Optional[int] = int(os.getenv("SMTP_PORT", "587")) if os.getenv("SMTP_PORT") else None
    SMTP_HOST: Optional[str] = os.getenv("SMTP_HOST")
    SMTP_USER: Optional[str] = os.getenv("SMTP_USER")
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD")
    EMAILS_FROM_EMAIL: Optional[str] = os.getenv("EMAILS_FROM_EMAIL")
    EMAILS_FROM_NAME: Optional[str] = os.getenv("EMAILS_FROM_NAME", "AI Travel Companion")
    
    # External APIs
    GOOGLE_MAPS_API_KEY: Optional[str] = os.getenv("GOOGLE_MAPS_API_KEY")
    WEATHER_API_KEY: Optional[str] = os.getenv("WEATHER_API_KEY")
    
    # AI/ML settings
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")
    
    # File storage
    UPLOAD_FOLDER: str = os.getenv("UPLOAD_FOLDER", os.path.join(os.path.dirname(__file__), "..", "uploads"))
    MAX_CONTENT_LENGTH: int = int(os.getenv("MAX_CONTENT_LENGTH", str(16 * 1024 * 1024)))  # Default 16MB
    
    # Rate limiting
    RATE_LIMIT: str = os.getenv("RATE_LIMIT", "100/minute")
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "logs/app.log")

# Create settings instance
settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)