"""
User service for user management operations.
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from uuid import UUID

from .base_service import BaseService
from repositories.user_repository import UserRepository, UserPreferenceRepository
from models.user import User, UserUpdate, UserPreference


class UserService(BaseService[User]):
    """Service for user management operations."""
    
    def __init__(self):
        self.user_repository = UserRepository()
        self.preference_repository = UserPreferenceRepository()
        super().__init__(self.user_repository)
    
    def get_user_by_email(self, db: Session, email: str) -> Optional[User]:
        """Get user by email address."""
        return self.user_repository.get_by_email(db, email)
    
    def get_active_users(self, db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        """Get all active users."""
        return self.user_repository.get_active_users(db, skip=skip, limit=limit)
    
    def update_user_profile(self, db: Session, user_id: UUID, user_update: UserUpdate) -> Optional[User]:
        """Update user profile information."""
        user = self.user_repository.get_by_id(db, user_id)
        if not user:
            return None
        
        return self.user_repository.update(db, user, user_update)
    
    def get_user_preferences(self, db: Session, user_id: UUID) -> List[UserPreference]:
        """Get all preferences for a user."""
        return self.preference_repository.get_user_preferences(db, user_id)
    
    def get_user_preference(self, db: Session, user_id: UUID, preference_type: str) -> Optional[UserPreference]:
        """Get a specific preference for a user."""
        return self.preference_repository.get_user_preference_by_type(db, user_id, preference_type)
    
    def update_user_preference(self, db: Session, user_id: UUID, preference_type: str, value: Dict[str, Any]) -> UserPreference:
        """Update or create a user preference."""
        return self.preference_repository.update_user_preference(db, user_id, preference_type, value)
    
    def delete_user_preferences(self, db: Session, user_id: UUID) -> int:
        """Delete all preferences for a user."""
        return self.preference_repository.delete_user_preferences(db, user_id)
    
    def get_user_stats(self, db: Session, user_id: UUID) -> Dict[str, Any]:
        """Get user statistics (trips, bookings, etc.)."""
        user = self.user_repository.get_by_id(db, user_id)
        if not user:
            return {}
        
        # This would be expanded based on your actual relationships
        stats = {
            "user_id": user_id,
            "email": user.email,
            "is_active": user.is_active,
            "member_since": user.created_at,
            "last_login": user.last_login,
            "total_trips": 0,  # Would query trip repository
            "total_bookings": 0,  # Would query booking repository
            "preferences_count": len(self.get_user_preferences(db, user_id))
        }
        
        return stats
    
    def search_users(self, db: Session, query: str, skip: int = 0, limit: int = 100) -> List[User]:
        """Search users by email, first_name, or last_name."""
        # This is a simple implementation - you might want to use full-text search
        filters = {
            'email': {'operator': 'like', 'value': query}
        }
        return self.user_repository.search(db, filters, skip=skip, limit=limit)
    
    def get_user_count(self, db: Session, active_only: bool = False) -> int:
        """Get total user count."""
        filters = {'is_active': True} if active_only else None
        return self.user_repository.count(db, filters)
    
    def bulk_update_users(self, db: Session, user_ids: List[UUID], update_data: Dict[str, Any]) -> List[User]:
        """Bulk update multiple users."""
        updated_users = []
        for user_id in user_ids:
            user = self.user_repository.get_by_id(db, user_id)
            if user:
                updated_user = self.user_repository.update(db, user, update_data)
                updated_users.append(updated_user)
        return updated_users
