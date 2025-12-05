"""
Chat service for chat management operations.
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from uuid import UUID

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
    
    def create_chat(self, db: Session, user_id: Optional[UUID], chat_create: ChatCreate) -> Chat:
        """Create a new chat for a user (or anonymous if user_id is None)."""
        # Use model_dump if available, fallback to dict()
        if hasattr(chat_create, 'model_dump'):
            chat_data = chat_create.model_dump(exclude_unset=False)
        else:
            chat_data = chat_create.dict()
        
        chat_data['user_id'] = user_id  # Can be None for anonymous users
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
        
        try:
            return self.chat_repository.update(db, chat, chat_update)
        except Exception:
            return None
    
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
        chat = self.chat_repository.get_by_id(db, chat_id
        )
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
            "created_time": chat.created_time
        }
        
        return stats
    
    def change_chat_status(self, db: Session, chat_id: UUID, new_status: str) -> Optional[Chat]:
        """Change chat status."""
        return self.chat_repository.update_chat_status(db, chat_id, new_status)
    
    def duplicate_chat(self, db: Session, chat_id: UUID, user_id: UUID) -> Optional[Chat]:
        """
        Duplicate an existing chat.
        
        Only allows duplicating:
        - Own chats (if original chat has user_id, it must match)
        - Anonymous chats (if original chat has no user_id)
        
        Args:
            db: Database session
            chat_id: Original chat ID to duplicate
            user_id: User ID for the new chat (must match original if original has user_id)
        
        Returns:
            Duplicated chat or None if validation fails
        """
        original_chat = self.chat_repository.get_by_id(db, chat_id)
        if not original_chat:
            return None
        
        # Validate ownership: can only duplicate own chats or anonymous chats
        if original_chat.user_id is not None and original_chat.user_id != user_id:
            return None  # Cannot duplicate another user's chat
        
        # Create new chat data based on original
        chat_data = {
            'user_id': user_id,
            'slot_id': None,  # New chat gets new slot_id (will be generated by AI service)
            'origin_code': original_chat.origin_code,
            'origin_name': original_chat.origin_name,
            'destination_code': original_chat.destination_code,
            'destination_name': original_chat.destination_name,
            'destination_city_name': original_chat.destination_city_name,
            'destination_city_code': original_chat.destination_city_code,
            'start_date': original_chat.start_date,
            'end_date': original_chat.end_date,
            'adults': original_chat.adults,
            'kids': original_chat.kids or 0,
            'budget': original_chat.budget,
            'hotel_request': original_chat.hotel_request,
            'hotel_amenities': original_chat.hotel_amenities or [],
            'hotel_rating': original_chat.hotel_rating,
            'car': original_chat.car,
            'attractions': original_chat.attractions or [],
            'status': 'draft',
            'notes': f"Copy of: {original_chat.notes or 'Chat'}" if original_chat.notes else None,
            'share_code': self._generate_share_code()
        }
        
        try:
            return self.chat_repository.create(db, chat_data)
        except Exception:
            return None
    
    def delete_chat(self, db: Session, chat_id: UUID, user_id: Optional[UUID]) -> bool:
        """
        Delete a chat (only if owned by user).
        Also deletes related plans and messages.
        
        Args:
            db: Database session
            chat_id: Chat ID to delete
            user_id: User ID (None for anonymous users - anonymous chats cannot be deleted by authenticated users)
        
        Returns:
            True if deleted, False otherwise
        """
        chat = self.chat_repository.get_by_id(db, chat_id)
        if not chat:
            return False
        
        # Anonymous chats (user_id=None) can only be deleted if request user_id is also None
        # Authenticated users cannot delete anonymous chats
        if chat.user_id is None:
            if user_id is not None:
                return False  # Authenticated user trying to delete anonymous chat
        else:
            # Chat has user_id - must match request user_id
            # Ensure both are UUID objects for proper comparison
            if user_id is None:
                return False
            if str(chat.user_id) != str(user_id):
                return False
        
        try:
            # Delete related plans first to avoid foreign key constraints
            from repositories.plan_repository import PlanRepository
            from repositories.chat_message_repository import ChatMessageRepository
            
            plan_repo = PlanRepository()
            message_repo = ChatMessageRepository()
            
            # Delete all plans for this chat
            plans = plan_repo.get_chat_plans(db, chat_id, skip=0, limit=1000)
            for plan in plans:
                try:
                    plan_repo.delete(db, plan.plan_id)
                except Exception:
                    pass
            
            # Delete all messages for this chat
            messages = message_repo.get_chat_messages(db, chat_id, skip=0, limit=1000)
            for message in messages:
                try:
                    message_repo.delete(db, message.id)
                except Exception:
                    pass
            
            # Now delete the chat
            deleted_chat = self.chat_repository.delete(db, chat_id)
            return deleted_chat is not None
        except Exception as e:
            db.rollback()
            return False
    
    def _generate_share_code(self) -> str:
        """
        Generate a unique share code for chat sharing.
        Note: In production, ensure uniqueness check against database.
        """
        import string
        import random
        
        # Generate an 8-character alphanumeric code
        characters = string.ascii_uppercase + string.digits
        return ''.join(random.choice(characters) for _ in range(8))

