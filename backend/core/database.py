from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError
import os
from urllib.parse import urlparse
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Database URL from environment variable
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://ayoyimikaajibade:postgres@localhost/twos_db"
)

def create_database_if_not_exists():
    """Create the database if it doesn't exist."""
    try:
        parsed = urlparse(SQLALCHEMY_DATABASE_URL)
        db_name = parsed.path.lstrip('/')
        
        if not db_name:
            logger.warning("No database name found in DATABASE_URL")
            return
        
        admin_url = SQLALCHEMY_DATABASE_URL.rsplit('/', 1)[0] + '/postgres'
        admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT", connect_args={"connect_timeout": 5})
        
        with admin_engine.connect() as conn:
            result = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :db_name"),
                {"db_name": db_name}
            )
            exists = result.fetchone()
            
            if not exists:
                conn.execute(text(f'CREATE DATABASE "{db_name}"'))
                logger.info(f"Database '{db_name}' created successfully")
            else:
                logger.debug(f"Database '{db_name}' already exists")
        
        admin_engine.dispose()
    except OperationalError as e:
        logger.warning(f"Could not connect to PostgreSQL to create database: {e}")
        logger.warning("The database may need to be created manually or PostgreSQL may not be running")
    except Exception as e:
        logger.warning(f"Could not create database automatically: {e}")
        logger.warning("Please ensure the database exists manually")

# Create database if it doesn't exist
create_database_if_not_exists()

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
    try:
        from models.user import User, UserPreference
        from models.chat import Chat
        from models.plan import Plan
        from models.chat_message import ChatMessage
        from models.token_blacklist import TokenBlacklist
        from models.base import BaseModel
        
        BaseModel.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully")
    except OperationalError as e:
        logger.error(f"Database initialization failed: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during database initialization: {e}")
        raise
