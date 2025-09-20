from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database URL from environment variable
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://ayoyimikaajibade:postgres@localhost/twos_db"
)

# Create SQLAlchemy engine with PostgreSQL optimizations
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=300
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency to get DB session
def get_db():
    """Database session dependency for FastAPI."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize the database by creating all tables."""
    # Import models to ensure they are registered with SQLAlchemy
    from models.user import User, UserPreference
    from models.trip import Trip
    from models.package import Package
    from models.booking import BookingReference
    from models.base import BaseModel
    
    BaseModel.metadata.create_all(bind=engine)
