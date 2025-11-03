"""
Dependency injection for services and repositories.
This module provides dependency injection for the application layers.
"""

from typing import Generator
from sqlalchemy.orm import Session
from fastapi import Depends

from core.database import SessionLocal
from services.auth_service import AuthService
from services.user_service import UserService
from services.chat_service import ChatService
from services.plan_service import PlanService
from services.chat_message_service import ChatMessageService


# Database dependency
def get_db() -> Generator[Session, None, None]:
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Service dependencies
def get_auth_service() -> AuthService:
    """Get authentication service instance."""
    return AuthService()


def get_user_service() -> UserService:
    """Get user service instance."""
    return UserService()


def get_chat_service() -> ChatService:
    """Get chat service instance."""
    return ChatService()


def get_plan_service() -> PlanService:
    """Get plan service instance."""
    return PlanService()


def get_chat_message_service() -> ChatMessageService:
    """Get chat message service instance."""
    from services.chat_message_service import ChatMessageService
    return ChatMessageService()


# Repository dependencies (if needed directly)
def get_user_repository():
    """Get user repository instance."""
    from repositories.user_repository import UserRepository
    return UserRepository()


def get_chat_repository():
    """Get chat repository instance."""
    from repositories.chat_repository import ChatRepository
    return ChatRepository()


def get_plan_repository():
    """Get plan repository instance."""
    from repositories.plan_repository import PlanRepository
    return PlanRepository()
