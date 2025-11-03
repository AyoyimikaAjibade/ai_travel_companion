"""
Chat message repository for chat message database operations.
"""

from typing import Optional, List
from sqlalchemy.orm import Session
from uuid import UUID

from .base_repository import BaseRepository
from models.chat_message import ChatMessage


class ChatMessageRepository(BaseRepository[ChatMessage]):
    """Repository for ChatMessage model operations."""
    
    def __init__(self):
        super().__init__(ChatMessage)
    
    def get_chat_messages(self, db: Session, chat_id: UUID, skip: int = 0, limit: int = 100) -> List[ChatMessage]:
        """Get all messages for a specific chat."""
        return db.query(ChatMessage).filter(
            ChatMessage.chat_id == chat_id
        ).order_by(ChatMessage.created_at.asc()).offset(skip).limit(limit).all()
    
    def get_messages_by_slot_id(self, db: Session, slot_id: str, skip: int = 0, limit: int = 100) -> List[ChatMessage]:
        """Get messages by slot_id (AI service chat ID)."""
        return db.query(ChatMessage).filter(
            ChatMessage.slot_id == slot_id
        ).order_by(ChatMessage.created_at.asc()).offset(skip).limit(limit).all()
    
    def get_user_messages(self, db: Session, user_id: UUID, skip: int = 0, limit: int = 100) -> List[ChatMessage]:
        """Get all messages for a user (across all chats)."""
        return db.query(ChatMessage).join(
            ChatMessage.chat
        ).filter(
            ChatMessage.chat.has(user_id=user_id)
        ).order_by(ChatMessage.created_at.desc()).offset(skip).limit(limit).all()
    
    def bulk_create_messages(self, db: Session, messages: List[dict]) -> List[ChatMessage]:
        """Bulk create chat messages."""
        if not messages:
            return []
        
        chat_messages = []
        for msg_data in messages:
            try:
                chat_message = ChatMessage(**msg_data)
                chat_messages.append(chat_message)
            except Exception as e:
                # Log error but continue with other messages
                import logging
                logging.error(f"Error creating chat message: {e}, data: {msg_data}")
        
        if chat_messages:
            db.add_all(chat_messages)
            db.commit()
            for msg in chat_messages:
                db.refresh(msg)
        
        return chat_messages

