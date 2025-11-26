"""
User service for user management operations.
"""

from typing import Optional
from sqlalchemy.orm import Session
from uuid import UUID

from .base_service import BaseService
from repositories.user_repository import UserRepository
from models.user import User, UserUpdate


class UserService(BaseService[User]):
    """Service for user management operations."""
    
    def __init__(self):
        self.user_repository = UserRepository()
        super().__init__(self.user_repository)
    
    def get_user_by_email(self, db: Session, email: str) -> Optional[User]:
        """Get user by email address."""
        return self.user_repository.get_by_email(db, email)
    
    def update_user_profile(self, db: Session, user_id: UUID, user_update: UserUpdate) -> Optional[User]:
        """Update user profile information."""
        user = self.user_repository.get_by_id(db, user_id)
        if not user:
            return None
        
        return self.user_repository.update(db, user, user_update)
