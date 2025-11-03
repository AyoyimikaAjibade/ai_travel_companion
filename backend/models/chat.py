from datetime import date, datetime
from typing import List, Optional, Dict, Any
from sqlmodel import SQLModel, Field, Relationship
import uuid

from .base import BaseModel

class ChatBase(SQLModel):
    """Base chat model with common fields."""
    slot_id: Optional[str] = Field(default=None, index=True, max_length=26)  # ULID format for AI service chat tracking
    origin_code: str = Field(max_length=3, nullable=False)
    origin_name: str = Field(nullable=False)
    destination_code: str = Field(max_length=3, nullable=False)
    destination_name: str = Field(nullable=False)
    start_date: date = Field(nullable=False)
    end_date: date = Field(nullable=False)
    adults: int = Field(default=1, ge=1)
    budget: Optional[float] = Field(default=None, ge=0)
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
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    adults: Optional[int] = Field(None, ge=1)
    budget: Optional[float] = Field(None, ge=0)
    status: Optional[str] = None
    notes: Optional[str] = None

class ChatPublic(ChatBase):
    """Public chat model for API responses."""
    id: uuid.UUID
    user_id: uuid.UUID
    share_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class Chat(ChatBase, BaseModel, table=True):
    """Chat model for database representation."""
    __tablename__ = "chats"
    
    user_id: uuid.UUID = Field(foreign_key="users.id", nullable=False)
    share_code: Optional[str] = Field(default=None, unique=True, index=True)
    
    # Relationships
    user: "User" = Relationship(back_populates="chats")
    plans: List["Plan"] = Relationship(back_populates="chat")
    messages: List["ChatMessage"] = Relationship(back_populates="chat")

