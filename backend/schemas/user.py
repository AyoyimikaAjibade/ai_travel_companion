from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List
from uuid import UUID

class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(..., min_length=8, max_length=100)

class UserUpdate(BaseModel):
    """Schema for updating user information."""
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8, max_length=100)

class UserInDBBase(UserBase):
    """Base schema for user stored in DB."""
    id: UUID
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class User(UserInDBBase):
    """Schema for returning user data (without sensitive info)."""
    pass

class UserInDB(UserInDBBase):
    """Schema for user stored in DB (includes hashed password)."""
    hashed_password: str

class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str

class PasswordResetRequest(BaseModel):
    """Schema for requesting a password reset."""
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    """Schema for confirming password reset."""
    token: str
    new_password: str = Field(..., min_length=8, max_length=100)

class ChangePassword(BaseModel):
    """Schema for changing password."""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)
