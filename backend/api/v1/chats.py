"""
Chat management API endpoints.
"""

from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID

from dependencies import get_db, get_chat_service
from services.chat_service import ChatService
from models.chat import Chat, ChatCreate, ChatUpdate, ChatPublic
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


@router.post("/", response_model=ChatPublic)
def create_chat(
    chat_in: ChatCreate,
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Create a new chat."""
    chat = chat_service.create_chat(db, current_user.id, chat_in)
    return chat


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
    
    # Check if user owns the chat
    if chat.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return chat


@router.put("/{chat_id}", response_model=ChatPublic)
def update_chat(
    chat_id: UUID,
    chat_update: ChatUpdate,
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Update a chat."""
    chat = chat_service.get_by_id(db, chat_id)
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    # Check if user owns the chat
    if chat.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    updated_chat = chat_service.update_chat(db, chat_id, chat_update)
    return updated_chat


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


@router.get("/shared/{share_code}", response_model=ChatPublic)
def get_shared_chat(
    share_code: str,
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service)
) -> Any:
    """Get a chat by share code (public access)."""
    chat = chat_service.get_chat_by_share_code(db, share_code)
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared chat not found"
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
    
    # Check if user owns the chat
    if chat.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return chat


@router.post("/{chat_id}/duplicate", response_model=ChatPublic)
def duplicate_chat(
    chat_id: UUID,
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Duplicate an existing chat."""
    duplicated_chat = chat_service.duplicate_chat(db, chat_id, current_user.id)
    if not duplicated_chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    return duplicated_chat


@router.put("/{chat_id}/status")
def change_chat_status(
    chat_id: UUID,
    new_status: str,
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Change chat status."""
    chat = chat_service.get_by_id(db, chat_id)
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    # Check if user owns the chat
    if chat.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Validate status
    valid_statuses = ['draft', 'planned', 'active', 'completed', 'cancelled']
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    updated_chat = chat_service.change_chat_status(db, chat_id, new_status)
    return {"message": "Chat status updated successfully", "chat": updated_chat}


@router.get("/{chat_id}/stats")
def get_chat_stats(
    chat_id: UUID,
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get chat statistics."""
    chat = chat_service.get_by_id(db, chat_id)
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    # Check if user owns the chat
    if chat.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    stats = chat_service.get_chat_stats(db, chat_id)
    return stats


@router.get("/search/")
def search_chats(
    destination: Optional[str] = Query(None),
    origin: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    budget_min: Optional[float] = Query(None, ge=0),
    budget_max: Optional[float] = Query(None, ge=0),
    slot_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Search user's chats with filters."""
    search_params = {'user_id': current_user.id}
    
    if destination:
        search_params['destination'] = destination
    if origin:
        search_params['origin'] = origin
    if status:
        search_params['status'] = status
    if budget_min:
        search_params['budget_min'] = budget_min
    if budget_max:
        search_params['budget_max'] = budget_max
    if slot_id:
        search_params['slot_id'] = slot_id
    
    chats = chat_service.search_chats(db, search_params, skip=skip, limit=limit)
    return chats

