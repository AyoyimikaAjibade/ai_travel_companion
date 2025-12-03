"""
Chat message model for tracking conversation history.
"""
from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field, Relationship, Column, JSON
import uuid

from .base import BaseModel


class ChatMessageBase(SQLModel):
    """Base chat message model with common fields."""
    role: str = Field(nullable=False, max_length=20)  # 'user' or 'bot'
    content: str = Field(nullable=False)
    slot_id: Optional[str] = Field(default=None, index=True, max_length=26)  # AI service slot_id
    message_metadata: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))  # Renamed from 'metadata' to avoid BaseModel conflict
    # For bot messages, can store AI response data
    ai_response_data: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))


class ChatMessageCreate(ChatMessageBase):
    """Model for creating a new chat message."""
    chat_id: uuid.UUID


class ChatMessageUpdate(SQLModel):
    """Model for updating chat message information."""
    content: Optional[str] = None
    message_metadata: Optional[Dict[str, Any]] = None
    ai_response_data: Optional[Dict[str, Any]] = None


class ChatMessage(ChatMessageBase, BaseModel, table=True):
    """Chat message model for database representation."""
    __tablename__ = "chat_messages"
    
    chat_id: uuid.UUID = Field(foreign_key="chats.id", nullable=False, index=True)
    
    # Relationships
    chat: "Chat" = Relationship(back_populates="messages")

