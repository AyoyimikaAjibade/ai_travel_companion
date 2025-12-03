"""
Authentication service for handling user authentication and authorization.
"""

from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import timedelta
from uuid import UUID
import secrets
import string

from services.base_service import BaseService
from repositories.user_repository import UserRepository
from models.user import User, UserCreate
from core.security import (
    verify_password, 
    get_password_hash, 
    create_access_token, 
    create_refresh_token,
)
from core.config import settings

class AuthService(BaseService[User]):
    """Service for authentication operations."""
    
    def __init__(self):
        self.user_repository = UserRepository()
        super().__init__(self.user_repository)
    
    def authenticate_user(self, db: Session, username_or_email: str, password: str) -> Optional[User]:
        user = None
        if "@" in username_or_email:
            user = self.user_repository.get_by_email(db, username_or_email)
        else:
            user = self.user_repository.get_by_username(db, username_or_email)
            if not user:
                user = self.user_repository.get_by_email(db, username_or_email)
        
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            return None
        
        self.user_repository.update_last_login(db, user.id)
        return user
    
    def register_user(self, db: Session, user_create: UserCreate) -> Optional[User]:
        """Register a new user with username, email, and password."""
        # Check if user already exists by email
        existing_user_by_email = self.user_repository.get_by_email(db, user_create.email)
        if existing_user_by_email:
            return None
        
        # Check if username already exists
        existing_user_by_username = self.user_repository.get_by_username(db, user_create.username)
        if existing_user_by_username:
            return None
        
        # Create new user with only required fields
        hashed_password = get_password_hash(user_create.password)
        user_data = {
            'username': user_create.username,
            'email': user_create.email,
            'hashed_password': hashed_password,
            'is_active': True,
            'is_superuser': False
        }
        
        return self.user_repository.create(db, user_data)
    
    def create_user_tokens(self, user_id: UUID) -> Dict[str, Any]:
        """Create access and refresh tokens for a user."""
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        return {
            "access_token": create_access_token(user_id, expires_delta=access_token_expires),
            "refresh_token": create_refresh_token(user_id, expires_delta=refresh_token_expires),
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user_id": str(user_id),
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
    
    def generate_temporary_password(self, length: int = 12) -> str:
        """Generate a secure temporary password."""
        # Use a mix of letters, digits, and special characters
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        return password
    
    def reset_password_with_temporary(self, db: Session, email: str) -> Optional[str]:
        """Reset user password by generating a temporary password."""
        user = self.user_repository.get_by_email(db, email)
        if not user:
            return None
        
        # Generate temporary password
        temp_password = self.generate_temporary_password()
        
        # Update password with temporary password
        user.hashed_password = get_password_hash(temp_password)
        self.user_repository.update(db, user, {"hashed_password": user.hashed_password})
        
        return temp_password
    
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
    
    def logout_user(self, db: Session, user_id: UUID, access_token: str) -> bool:
        from models.token_blacklist import TokenBlacklist
        from jose import jwt
        from datetime import datetime
        from core.config import settings
        
        user = self.user_repository.get_by_id(db, user_id)
        if not user:
            return False
        
        try:
            payload = jwt.decode(access_token, settings.JWT_SECRET_KEY, algorithms=[settings.ALGORITHM])
            expires_at = datetime.utcfromtimestamp(payload.get("exp", 0))
            
            token_hash = TokenBlacklist.hash_token(access_token)
            
            existing = db.query(TokenBlacklist).filter(
                TokenBlacklist.token_hash == token_hash
            ).first()
            
            if not existing:
                blacklist_entry = TokenBlacklist(
                    token_hash=token_hash,
                    user_id=user_id,
                    expires_at=expires_at
                )
                db.add(blacklist_entry)
                db.commit()
            
            return True
        except Exception:
            db.rollback()
            return False