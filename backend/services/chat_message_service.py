"""
Chat message service for managing conversation history.
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from uuid import UUID

from .base_service import BaseService
from repositories.chat_message_repository import ChatMessageRepository
from models.chat_message import ChatMessage, ChatMessageCreate, ChatMessageUpdate
from core.cache import cache_service


class ChatMessageService(BaseService[ChatMessage]):
    """Service for chat message management operations."""
    
    def __init__(self):
        self.chat_message_repository = ChatMessageRepository()
        super().__init__(self.chat_message_repository)
    
    def save_message_to_cache(self, chat_id: UUID, slot_id: str, role: str, content: str, metadata: Optional[Dict[str, Any]] = None, ai_response_data: Optional[Dict[str, Any]] = None) -> bool:
        """Save a chat message to Redis cache."""
        message_data = {
            'role': role,
            'content': content,
            'slot_id': slot_id,
            'metadata': metadata or {},
            'ai_response_data': ai_response_data,
            'timestamp': str(self._get_current_timestamp())
        }
        return cache_service.save_chat_message(str(chat_id), slot_id, message_data)
    
    def get_cached_messages(self, chat_id: UUID, slot_id: str) -> List[Dict[str, Any]]:
        """Get all cached chat messages."""
        return cache_service.get_chat_messages(str(chat_id), slot_id)
    
    def confirm_messages(self, db: Session, chat_id: UUID, slot_id: str) -> List[ChatMessage]:
        """Save all cached messages to PostgreSQL database."""
        cached_messages = cache_service.get_chat_messages(str(chat_id), slot_id)
        
        if not cached_messages:
            return []
        
        # Convert cached messages to database records
        messages_to_create = []
        for msg_data in cached_messages:
            messages_to_create.append({
                'chat_id': chat_id,
                'role': msg_data.get('role'),
                'content': msg_data.get('content'),
                'slot_id': msg_data.get('slot_id'),
                'message_metadata': msg_data.get('metadata', {}),  # Map 'metadata' from cache to 'message_metadata' for model
                'ai_response_data': msg_data.get('ai_response_data')
            })
        
        # Bulk create messages
        saved_messages = self.chat_message_repository.bulk_create_messages(db, messages_to_create)
        
        # Clear cache after successful save
        cache_service.delete_chat_messages(str(chat_id), slot_id)
        
        return saved_messages
    
    def get_chat_messages(self, db: Session, chat_id: UUID, skip: int = 0, limit: int = 100) -> List[ChatMessage]:
        """Get all messages for a specific chat from database."""
        return self.chat_message_repository.get_chat_messages(db, chat_id, skip=skip, limit=limit)
    
    def get_messages_by_slot_id(self, db: Session, slot_id: str, skip: int = 0, limit: int = 100) -> List[ChatMessage]:
        """Get messages by slot_id from database."""
        return self.chat_message_repository.get_messages_by_slot_id(db, slot_id, skip=skip, limit=limit)
    
    def create_message(self, db: Session, message_create: ChatMessageCreate) -> ChatMessage:
        """Create a new chat message in database."""
        return self.chat_message_repository.create(db, message_create)
    
    def _get_current_timestamp(self) -> str:
        """Get current timestamp as ISO format string."""
        from datetime import datetime
        return datetime.utcnow().isoformat()

