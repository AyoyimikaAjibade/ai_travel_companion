"""
Authentication service for handling user authentication and authorization.
"""

from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from uuid import UUID

from services.base_service import BaseService
from repositories.user_repository import UserRepository
from models.user import User, UserCreate
from core.security import (
    verify_password, 
    get_password_hash, 
    create_access_token, 
    create_refresh_token
)
from core.config import settings


class AuthService(BaseService[User]):
    """Service for authentication operations."""
    
    def __init__(self):
        self.user_repository = UserRepository()
        super().__init__(self.user_repository)
    
    def authenticate_user(self, db: Session, email: str, password: str) -> Optional[User]:
        """Authenticate a user with email and password."""
        user = self.user_repository.get_by_email(db, email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            return None
        
        # Update last login
        self.user_repository.update_last_login(db, user.id)
        return user
    
    def register_user(self, db: Session, user_create: UserCreate) -> Optional[User]:
        """Register a new user."""
        # Check if user already exists
        existing_user = self.user_repository.get_by_email(db, user_create.email)
        if existing_user:
            return None
        
        # Create new user
        hashed_password = get_password_hash(user_create.password)
        user_data = user_create.dict()
        user_data.pop('password')  # Remove plain password
        user_data['hashed_password'] = hashed_password
        
        return self.user_repository.create(db, user_data)
    
    def create_user_tokens(self, user_id: UUID) -> Dict[str, Any]:
        """Create access and refresh tokens for a user."""
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        return {
            "access_token": create_access_token(user_id, expires_delta=access_token_expires),
            "refresh_token": create_refresh_token(user_id, expires_delta=refresh_token_expires),
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    
    def verify_user_active(self, db: Session, user_id: UUID) -> bool:
        """Verify if a user is active."""
        user = self.user_repository.get_by_id(db, user_id)
        return user is not None and user.is_active
    
    def change_password(self, db: Session, user_id: UUID, current_password: str, new_password: str) -> bool:
        """Change user password after verifying current password."""
        user = self.user_repository.get_by_id(db, user_id)
        if not user:
            return False
        
        if not verify_password(current_password, user.hashed_password):
            return False
        
        # Update password
        user.hashed_password = get_password_hash(new_password)
        self.user_repository.update(db, user, {"hashed_password": user.hashed_password})
        return True
    
    def reset_password(self, db: Session, user_id: UUID, new_password: str) -> bool:
        """Reset user password (for admin or password reset flow)."""
        user = self.user_repository.get_by_id(db, user_id)
        if not user:
            return False
        
        # Update password
        user.hashed_password = get_password_hash(new_password)
        self.user_repository.update(db, user, {"hashed_password": user.hashed_password})
        return True
    
    def deactivate_user(self, db: Session, user_id: UUID) -> bool:
        """Deactivate a user account."""
        user = self.user_repository.deactivate_user(db, user_id)
        return user is not None
    
    def activate_user(self, db: Session, user_id: UUID) -> bool:
        """Activate a user account."""
        user = self.user_repository.activate_user(db, user_id)
        return user is not None
