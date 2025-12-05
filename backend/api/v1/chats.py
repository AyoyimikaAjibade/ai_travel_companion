"""
Chat management API endpoints.
"""

from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID

from dependencies import get_db, get_chat_service
from services.chat_service import ChatService
from models.chat import Chat
from core.security import get_current_active_user
from models.user import User

router = APIRouter()


def _chat_to_current_slots(chat: Chat) -> Dict[str, Any]:
    """
    Convert Chat model to current_slots dictionary format matching AI service structure.
    Maps Chat model fields to current_slots format with nested objects for dates, pax, and hotel.
    """
    if hasattr(chat, 'model_dump'):
        chat_dict = chat.model_dump(exclude_unset=True)
    else:
        chat_dict = chat.dict()
    
    # Build current_slots in AI service format
    current_slots = {
        'slot_id': chat_dict.get('slot_id'),
        'chat_id': chat_dict.get('id'),
        'origin_airport_code': chat_dict.get('origin_code'),
        'destination_airport_code': chat_dict.get('destination_code'),
        'destination_city_name': chat_dict.get('destination_city_name'),
        'destination_city_code': chat_dict.get('destination_city_code'),
        'dates': {
            'start': chat_dict.get('start_date').isoformat() if chat_dict.get('start_date') else None,
            'end': chat_dict.get('end_date').isoformat() if chat_dict.get('end_date') else None
        },
        'pax': {
            'adults': chat_dict.get('adults', 1),
            'kids': chat_dict.get('kids', 0) if chat_dict.get('kids') is not None else 0
        },
        'budget': chat_dict.get('budget'),
        'hotel': {
            'request': chat_dict.get('hotel_request'),
            'amenities': chat_dict.get('hotel_amenities') or [],
            'rating': chat_dict.get('hotel_rating')
        },
        'car': chat_dict.get('car'),
        'attractions': chat_dict.get('attractions') or []
    }
    
    # Clean up None values - but keep nested structures even if they have None values
    cleaned = {}
    for k, v in current_slots.items():
        if v is not None:
            if isinstance(v, dict):
                # Clean nested dict but keep the structure
                cleaned_nested = {nk: nv for nk, nv in v.items() if nv is not None}
                if cleaned_nested:  # Only include if has some values
                    cleaned[k] = cleaned_nested
            elif isinstance(v, list):
                # Include list even if empty
                cleaned[k] = v
            else:
                cleaned[k] = v
    
    return cleaned


@router.get("/")
def get_user_chats(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get all chats for the current user."""
    chats = chat_service.get_user_chats(db, current_user.id, skip=skip, limit=limit)
    return [{"current_slots": _chat_to_current_slots(chat)} for chat in chats]


@router.get("/{chat_id}")
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
    
    return {"current_slots": _chat_to_current_slots(chat)}


@router.get("/slot/{slot_id}")
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
    
    return {"current_slots": _chat_to_current_slots(chat)}


@router.delete("/{chat_id}")
def delete_chat(
    chat_id: UUID,
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Delete a chat."""
    chat = chat_service.get_by_id(db, chat_id)
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
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
    
    success = chat_service.delete_chat(db, chat_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete chat"
        )
    
    return {"message": "Chat deleted successfully"}
