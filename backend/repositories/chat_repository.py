"""
Chat repository for chat-specific database operations.
"""

from typing import Optional, List
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import date

from .base_repository import BaseRepository
from models.chat import Chat


class ChatRepository(BaseRepository[Chat]):
    """Repository for Chat model operations."""
    
    def __init__(self):
        super().__init__(Chat)
    
    def get_user_chats(self, db: Session, user_id: UUID, skip: int = 0, limit: int = 100) -> List[Chat]:
        """Get all chats for a specific user."""
        return db.query(Chat).filter(Chat.user_id == user_id).offset(skip).limit(limit).all()
    
    def get_chat_by_share_code(self, db: Session, share_code: str) -> Optional[Chat]:
        """Get chat by share code."""
        return db.query(Chat).filter(Chat.share_code == share_code).first()
    
    def get_chat_by_slot_id(self, db: Session, slot_id: str) -> Optional[Chat]:
        """Get chat by slot_id (AI service chat ID)."""
        return db.query(Chat).filter(Chat.slot_id == slot_id).first()
    
    def get_chats_by_destination(self, db: Session, destination_code: str, skip: int = 0, limit: int = 100) -> List[Chat]:
        """Get chats by destination."""
        return db.query(Chat).filter(
            Chat.destination_code == destination_code
        ).offset(skip).limit(limit).all()
    
    def get_chats_by_date_range(self, db: Session, start_date: date, end_date: date, skip: int = 0, limit: int = 100) -> List[Chat]:
        """Get chats within a date range."""
        return db.query(Chat).filter(
            Chat.start_date >= start_date,
            Chat.end_date <= end_date
        ).offset(skip).limit(limit).all()
    
    def get_chats_by_status(self, db: Session, status: str, skip: int = 0, limit: int = 100) -> List[Chat]:
        """Get chats by status."""
        return db.query(Chat).filter(Chat.status == status).offset(skip).limit(limit).all()
    
    def get_user_active_chats(self, db: Session, user_id: UUID) -> List[Chat]:
        """Get active chats for a user."""
        return db.query(Chat).filter(
            Chat.user_id == user_id,
            Chat.status.in_(['draft', 'planned', 'active'])
        ).all()
    
    def search_chats(self, db: Session, search_params: dict, skip: int = 0, limit: int = 100) -> List[Chat]:
        """Search chats with various filters."""
        query = db.query(Chat)
        
        if 'user_id' in search_params:
            query = query.filter(Chat.user_id == search_params['user_id'])
        
        if 'destination' in search_params:
            query = query.filter(
                Chat.destination_name.ilike(f"%{search_params['destination']}%")
            )
        
        if 'origin' in search_params:
            query = query.filter(
                Chat.origin_name.ilike(f"%{search_params['origin']}%")
            )
        
        if 'status' in search_params:
            query = query.filter(Chat.status == search_params['status'])
        
        if 'budget_min' in search_params:
            query = query.filter(Chat.budget >= search_params['budget_min'])
        
        if 'budget_max' in search_params:
            query = query.filter(Chat.budget <= search_params['budget_max'])
        
        if 'slot_id' in search_params:
            query = query.filter(Chat.slot_id == search_params['slot_id'])
        
        return query.offset(skip).limit(limit).all()
    
    def update_chat_status(self, db: Session, chat_id: UUID, status: str) -> Optional[Chat]:
        """Update chat status."""
        chat = self.get_by_id(db, chat_id)
        if chat:
            chat.status = status
            db.commit()
            db.refresh(chat)
        return chat

