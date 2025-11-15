"""
Chat message management API endpoints.
"""

from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID

from dependencies import get_db, get_chat_message_service, get_chat_service
from services.chat_message_service import ChatMessageService
from services.chat_service import ChatService
from models.chat_message import ChatMessage
from core.security import get_current_active_user
from models.user import User

router = APIRouter()


@router.get("/{chat_id}/messages", response_model=List[ChatMessage])
def get_chat_messages(
    chat_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    chat_message_service: ChatMessageService = Depends(get_chat_message_service),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get all messages for a specific chat."""
    # Verify chat exists and user owns it
    chat = chat_service.get_by_id(db, chat_id)
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    if chat.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    messages = chat_message_service.get_chat_messages(db, chat_id, skip=skip, limit=limit)
    return messages


@router.get("/slot/{slot_id}/messages", response_model=List[ChatMessage])
def get_messages_by_slot_id(
    slot_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    chat_message_service: ChatMessageService = Depends(get_chat_message_service),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get all messages for a specific slot_id (AI service chat ID)."""
    # Verify chat exists and user owns it
    chat = chat_service.get_chat_by_slot_id(db, slot_id)
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    if chat.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    messages = chat_message_service.get_messages_by_slot_id(db, slot_id, skip=skip, limit=limit)
    return messages

