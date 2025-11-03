from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlmodel import SQLModel, Field, Relationship, Column, JSON
from pydantic import EmailStr
import uuid

from .base import BaseModel

class UserBase(SQLModel):
    """Base user model with common fields."""
    email: EmailStr = Field(unique=True, index=True, nullable=False)
    username: str = Field(unique=True, index=True, nullable=False, max_length=50)
    first_name: Optional[str] = Field(default=None, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    is_active: bool = Field(default=True)
    is_superuser: bool = Field(default=False)

class UserCreate(SQLModel):
    """Model for creating a new user."""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr = Field(..., unique=True, index=True, nullable=False)
    password: str = Field(..., min_length=8, max_length=100)

class UserUpdate(SQLModel):
    """Model for updating user information."""
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, max_length=50)
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=8, max_length=100)

class User(UserBase, BaseModel, table=True):
    """User model for database representation."""
    __tablename__ = "users"
    
    hashed_password: str = Field(nullable=False)
    last_login: Optional[datetime] = None
    
    # Relationships
    preferences: List["UserPreference"] = Relationship(back_populates="user")
    chats: List["Chat"] = Relationship(back_populates="user")

class UserPreference(BaseModel, table=True):
    """User preferences model."""
    __tablename__ = "user_preferences"
    
    user_id: uuid.UUID = Field(foreign_key="users.id", nullable=False)
    preference_type: str = Field(max_length=50, nullable=False)
    value: Dict[str, Any] = Field(default={}, sa_column=Column(JSON, nullable=False))
    
    # Relationships
    user: User = Relationship(back_populates="preferences")
