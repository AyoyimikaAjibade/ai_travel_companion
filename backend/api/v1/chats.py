"""
Chat management API endpoints.
"""

from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID

from dependencies import get_db, get_chat_service
from services.chat_service import ChatService
from models.chat import ChatPublic
from core.security import get_current_active_user
from models.user import User

router = APIRouter()


@router.get("/", response_model=List[ChatPublic])
def get_user_chats(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get all chats for the current user."""
    chats = chat_service.get_user_chats(db, current_user.id, skip=skip, limit=limit)
    return chats


@router.get("/{chat_id}", response_model=ChatPublic)
def get_chat(
    chat_id: UUID,
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get a specific chat."""
    chat = chat_service.get_by_id(db, chat_id)
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    # Check if user owns the chat (anonymous chats have user_id=None and can't be accessed)
    if chat.user_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This chat belongs to an anonymous user. Please authenticate to access your chats."
        )
    if chat.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return chat


@router.get("/slot/{slot_id}", response_model=ChatPublic)
def get_chat_by_slot_id(
    slot_id: str,
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get a chat by slot_id (AI service chat ID)."""
    chat = chat_service.get_chat_by_slot_id(db, slot_id)
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    # Check if user owns the chat (anonymous chats have user_id=None and can't be accessed)
    if chat.user_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This chat belongs to an anonymous user. Please authenticate to access your chats."
        )
    if chat.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return chat


@router.delete("/{chat_id}")
def delete_chat(
    chat_id: UUID,
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Delete a chat."""
    success = chat_service.delete_chat(db, chat_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found or not owned by user"
        )
    
    return {"message": "Chat deleted successfully"}
