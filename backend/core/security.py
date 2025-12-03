from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
import warnings
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import ValidationError
import os
from dotenv import load_dotenv
from uuid import UUID

from models import User
from core.database import get_db
from schemas.token import TokenPayload
from core.config import settings

# Security configurations from settings
SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS

# Password hashing
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")
# Optional auth scheme for endpoints that work with or without authentication
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate a password hash."""
    return pwd_context.hash(password)

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    """Create an access token."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    """Create a refresh token."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def is_token_blacklisted(db: Session, token: str) -> bool:
    import hashlib
    from models.token_blacklist import TokenBlacklist
    from datetime import datetime
    
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    blacklisted = db.query(TokenBlacklist).filter(
        TokenBlacklist.token_hash == token_hash
    ).first()
    
    if blacklisted:
        if blacklisted.expires_at > datetime.utcnow():
            return True
        else:
            try:
                db.delete(blacklisted)
                db.commit()
            except Exception:
                db.rollback()
    
    return False

async def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if is_token_blacklisted(db, token):
        raise credentials_exception
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_data = TokenPayload(**payload)
        
        if token_data.type != "access":
            raise credentials_exception
            
        user = db.query(User).filter(User.id == UUID(token_data.sub)).first()
        if user is None:
            raise credentials_exception
        
        if not user.is_active:
            raise credentials_exception
            
        return user
        
    except (JWTError, ValidationError):
        raise credentials_exception

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Get the current active user."""
    # Add any additional checks for active status if needed
    # if not current_user.is_active:
    #     raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_user_optional(
    db: Session = Depends(get_db), token: Optional[str] = Depends(oauth2_scheme_optional)
) -> Optional[User]:
    if not token:
        return None
    
    if is_token_blacklisted(db, token):
        return None
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_data = TokenPayload(**payload)
        
        if token_data.type != "access":
            return None
            
        user = db.query(User).filter(User.id == UUID(token_data.sub)).first()
        if user and not user.is_active:
            return None
        return user
        
    except (JWTError, ValidationError):
        return None
