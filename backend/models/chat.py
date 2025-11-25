from datetime import date, datetime
from typing import List, Optional, Dict, Any
from sqlmodel import SQLModel, Field, Relationship, Column, JSON
import uuid

from .base import BaseModel

class ChatBase(SQLModel):
    """Base chat model with common fields."""
    slot_id: Optional[str] = Field(default=None, index=True, max_length=26)  # ULID format for AI service chat tracking
    origin_code: str = Field(max_length=3, nullable=False)
    origin_name: str = Field(nullable=False)
    destination_code: str = Field(max_length=3, nullable=False)
    destination_name: str = Field(nullable=False)
    destination_city_name: Optional[str] = Field(default=None)  # From current_slots.destination_city_name
    destination_city_code: Optional[str] = Field(default=None, max_length=3)  # From current_slots.destination_city_code
    start_date: date = Field(nullable=False)
    end_date: date = Field(nullable=False)
    adults: int = Field(default=1, ge=1)
    kids: Optional[int] = Field(default=0, ge=0)  # From current_slots.pax.kids
    budget: Optional[float] = Field(default=None, ge=0)
    hotel_request: Optional[bool] = Field(default=None)  # From current_slots.hotel.request
    hotel_amenities: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))  # From current_slots.hotel.amenities
    hotel_rating: Optional[int] = Field(default=None, ge=0, le=5)  # From current_slots.hotel.rating
    car: Optional[bool] = Field(default=None)  # From current_slots.car
    attractions: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))  # From current_slots.attractions
    status: str = Field(default="draft", max_length=20)
    notes: Optional[str] = Field(default=None)

class ChatCreate(ChatBase):
    """Model for creating a new chat."""
    pass

class ChatUpdate(SQLModel):
    """Model for updating chat information."""
    slot_id: Optional[str] = None
    origin_code: Optional[str] = None
    origin_name: Optional[str] = None
    destination_code: Optional[str] = None
    destination_name: Optional[str] = None
    destination_city_name: Optional[str] = None
    destination_city_code: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    adults: Optional[int] = Field(None, ge=1)
    kids: Optional[int] = Field(None, ge=0)
    budget: Optional[float] = Field(None, ge=0)
    hotel_request: Optional[bool] = None
    hotel_amenities: Optional[List[str]] = None
    hotel_rating: Optional[int] = Field(None, ge=0, le=5)
    car: Optional[bool] = None
    attractions: Optional[List[str]] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class ChatPublic(ChatBase):
    """Public chat model for API responses."""
    id: uuid.UUID
    user_id: Optional[uuid.UUID]  # Optional for anonymous/unauthenticated users
    share_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class Chat(ChatBase, BaseModel, table=True):
    """Chat model for database representation."""
    __tablename__ = "chats"
    
    user_id: Optional[uuid.UUID] = Field(foreign_key="users.id", nullable=True, default=None)  # Nullable for anonymous users
    share_code: Optional[str] = Field(default=None, unique=True, index=True)
    
    # Relationships
    user: Optional["User"] = Relationship(back_populates="chats")
    plans: List["Plan"] = Relationship(back_populates="chat")
    messages: List["ChatMessage"] = Relationship(back_populates="chat")

