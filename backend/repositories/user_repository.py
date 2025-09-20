"""
User repository for user-specific database operations.
"""

from typing import Optional, List
from sqlalchemy.orm import Session
from uuid import UUID

from .base_repository import BaseRepository
from models.user import User, UserPreference


class UserRepository(BaseRepository[User]):
    """Repository for User model operations."""
    
    def __init__(self):
        super().__init__(User)
    
    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        """Get user by email address."""
        return db.query(User).filter(User.email == email).first()
    
    def get_active_users(self, db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        """Get all active users."""
        return db.query(User).filter(User.is_active == True).offset(skip).limit(limit).all()
    
    def get_superusers(self, db: Session) -> List[User]:
        """Get all superusers."""
        return db.query(User).filter(User.is_superuser == True).all()
    
    def update_last_login(self, db: Session, user_id: UUID) -> Optional[User]:
        """Update user's last login timestamp."""
        from datetime import datetime
        user = self.get_by_id(db, user_id)
        if user:
            user.last_login = datetime.utcnow()
            db.commit()
            db.refresh(user)
        return user
    
    def deactivate_user(self, db: Session, user_id: UUID) -> Optional[User]:
        """Deactivate a user account."""
        user = self.get_by_id(db, user_id)
        if user:
            user.is_active = False
            db.commit()
            db.refresh(user)
        return user
    
    def activate_user(self, db: Session, user_id: UUID) -> Optional[User]:
        """Activate a user account."""
        user = self.get_by_id(db, user_id)
        if user:
            user.is_active = True
            db.commit()
            db.refresh(user)
        return user


class UserPreferenceRepository(BaseRepository[UserPreference]):
    """Repository for UserPreference model operations."""
    
    def __init__(self):
        super().__init__(UserPreference)
    
    def get_user_preferences(self, db: Session, user_id: UUID) -> List[UserPreference]:
        """Get all preferences for a user."""
        return db.query(UserPreference).filter(UserPreference.user_id == user_id).all()
    
    def get_user_preference_by_type(self, db: Session, user_id: UUID, preference_type: str) -> Optional[UserPreference]:
        """Get a specific preference type for a user."""
        return db.query(UserPreference).filter(
            UserPreference.user_id == user_id,
            UserPreference.preference_type == preference_type
        ).first()
    
    def update_user_preference(self, db: Session, user_id: UUID, preference_type: str, value: dict) -> UserPreference:
        """Update or create a user preference."""
        existing_pref = self.get_user_preference_by_type(db, user_id, preference_type)
        
        if existing_pref:
            existing_pref.value = value
            db.commit()
            db.refresh(existing_pref)
            return existing_pref
        else:
            new_pref = UserPreference(
                user_id=user_id,
                preference_type=preference_type,
                value=value
            )
            db.add(new_pref)
            db.commit()
            db.refresh(new_pref)
            return new_pref
    
    def delete_user_preferences(self, db: Session, user_id: UUID) -> int:
        """Delete all preferences for a user."""
        count = db.query(UserPreference).filter(UserPreference.user_id == user_id).count()
        db.query(UserPreference).filter(UserPreference.user_id == user_id).delete()
        db.commit()
        return count
