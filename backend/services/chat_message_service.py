"""
Chat message service for managing conversation history.
"""

from typing import List
from sqlalchemy.orm import Session
from uuid import UUID

from .base_service import BaseService
from repositories.chat_message_repository import ChatMessageRepository
from models.chat_message import ChatMessage, ChatMessageCreate


class ChatMessageService(BaseService[ChatMessage]):
    """Service for chat message management operations."""
    
    def __init__(self):
        self.chat_message_repository = ChatMessageRepository()
        super().__init__(self.chat_message_repository)
    
    def get_chat_messages(self, db: Session, chat_id: UUID, skip: int = 0, limit: int = 100) -> List[ChatMessage]:
        """Get all messages for a specific chat from database."""
        return self.chat_message_repository.get_chat_messages(db, chat_id, skip=skip, limit=limit)
    
    def get_messages_by_slot_id(self, db: Session, slot_id: str, skip: int = 0, limit: int = 100) -> List[ChatMessage]:
        """Get messages by slot_id from database."""
        return self.chat_message_repository.get_messages_by_slot_id(db, slot_id, skip=skip, limit=limit)
    
    def create_message(self, db: Session, message_create: ChatMessageCreate) -> ChatMessage:
        """Create a new chat message in database."""
        return self.chat_message_repository.create(db, message_create)
