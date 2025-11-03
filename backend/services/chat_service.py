"""
Chat service for chat management operations.
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from uuid import UUID, uuid4
from datetime import date

from .base_service import BaseService
from repositories.chat_repository import ChatRepository
from models.chat import Chat, ChatCreate, ChatUpdate


class ChatService(BaseService[Chat]):
    """Service for chat management operations."""
    
    def __init__(self):
        self.chat_repository = ChatRepository()
        super().__init__(self.chat_repository)
    
    def get_user_chats(self, db: Session, user_id: UUID, skip: int = 0, limit: int = 100) -> List[Chat]:
        """Get all chats for a specific user."""
        return self.chat_repository.get_user_chats(db, user_id, skip=skip, limit=limit)
    
    def create_chat(self, db: Session, user_id: UUID, chat_create: ChatCreate) -> Chat:
        """Create a new chat for a user."""
        chat_data = chat_create.dict()
        chat_data['user_id'] = user_id
        chat_data['share_code'] = self._generate_share_code()
        
        return self.chat_repository.create(db, chat_data)
    
    def get_chat_by_share_code(self, db: Session, share_code: str) -> Optional[Chat]:
        """Get chat by share code."""
        return self.chat_repository.get_chat_by_share_code(db, share_code)
    
    def get_chat_by_slot_id(self, db: Session, slot_id: str) -> Optional[Chat]:
        """Get chat by slot_id (AI service chat ID)."""
        return self.chat_repository.get_chat_by_slot_id(db, slot_id)
    
    def update_chat(self, db: Session, chat_id: UUID, chat_update: ChatUpdate) -> Optional[Chat]:
        """Update chat information."""
        chat = self.chat_repository.get_by_id(db, chat_id)
        if not chat:
            return None
        
        return self.chat_repository.update(db, chat, chat_update)
    
    def get_chats_by_destination(self, db: Session, destination_code: str, skip: int = 0, limit: int = 100) -> List[Chat]:
        """Get chats by destination."""
        return self.chat_repository.get_chats_by_destination(db, destination_code, skip=skip, limit=limit)
    
    def get_upcoming_chats(self, db: Session, user_id: UUID) -> List[Chat]:
        """Get upcoming chats for a user."""
        from datetime import date
        today = date.today()
        
        search_params = {
            'user_id': user_id,
            'status': 'active'
        }
        
        # This would need to be enhanced to filter by date
        return self.chat_repository.search_chats(db, search_params)
    
    def search_chats(self, db: Session, search_params: Dict[str, Any], skip: int = 0, limit: int = 100) -> List[Chat]:
        """Search chats with various filters."""
        return self.chat_repository.search_chats(db, search_params, skip=skip, limit=limit)
    
    def get_chat_stats(self, db: Session, chat_id: UUID) -> Dict[str, Any]:
        """Get chat statistics."""
        chat = self.chat_repository.get_by_id(db, chat_id)
        if not chat:
            return {}
        
        # This would be expanded based on your actual relationships
        stats = {
            "chat_id": chat_id,
            "slot_id": chat.slot_id,
            "destination": chat.destination_name,
            "origin": chat.origin_name,
            "duration_days": (chat.end_date - chat.start_date).days,
            "status": chat.status,
            "budget": chat.budget,
            "adults": chat.adults,
            "total_plans": 0,  # Would query plan repository
            "total_messages": 0,  # Would query chat message repository
            "created_at": chat.created_at
        }
        
        return stats
    
    def change_chat_status(self, db: Session, chat_id: UUID, new_status: str) -> Optional[Chat]:
        """Change chat status."""
        return self.chat_repository.update_chat_status(db, chat_id, new_status)
    
    def duplicate_chat(self, db: Session, chat_id: UUID, user_id: UUID) -> Optional[Chat]:
        """Duplicate an existing chat."""
        original_chat = self.chat_repository.get_by_id(db, chat_id)
        if not original_chat:
            return None
        
        # Create new chat data based on original
        chat_data = {
            'user_id': user_id,
            'slot_id': None,  # New chat gets new slot_id
            'origin_code': original_chat.origin_code,
            'origin_name': original_chat.origin_name,
            'destination_code': original_chat.destination_code,
            'destination_name': original_chat.destination_name,
            'start_date': original_chat.start_date,
            'end_date': original_chat.end_date,
            'adults': original_chat.adults,
            'budget': original_chat.budget,
            'status': 'draft',
            'notes': f"Copy of: {original_chat.notes or 'Chat'}",
            'share_code': self._generate_share_code()
        }
        
        return self.chat_repository.create(db, chat_data)
    
    def delete_chat(self, db: Session, chat_id: UUID, user_id: UUID) -> bool:
        """Delete a chat (only if owned by user)."""
        chat = self.chat_repository.get_by_id(db, chat_id)
        if not chat or chat.user_id != user_id:
            return False
        
        deleted_chat = self.chat_repository.delete(db, chat_id)
        return deleted_chat is not None
    
    def _generate_share_code(self) -> str:
        """Generate a unique share code for chat sharing."""
        import string
        import random
        
        # Generate a 8-character alphanumeric code
        characters = string.ascii_uppercase + string.digits
        return ''.join(random.choice(characters) for _ in range(8))

