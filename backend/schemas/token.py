from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class TokenBase(BaseModel):
    """Base token schema."""
    token: str
    token_type: str

class Token(BaseModel):
    """Token schema for access and refresh tokens."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class TokenPayload(BaseModel):
    """Token payload schema."""
    sub: str  # Subject (user id)
    exp: datetime
    type: str  # 'access' or 'refresh'
    
    class Config:
        from_attributes = True

class TokenCreate(BaseModel):
    """Schema for token creation."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    
    class Config:
        from_attributes = True
