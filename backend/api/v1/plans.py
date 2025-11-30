"""
Plan management API endpoints.
"""

from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID

from dependencies import get_db, get_plan_service, get_chat_service
from services.plan_service import PlanService
from services.chat_service import ChatService
from models.plan import Plan
from core.security import get_current_active_user
from models.user import User

router = APIRouter()


@router.get("/chat/{chat_id}", response_model=List[Plan])
def get_chat_plans(
    chat_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    plan_service: PlanService = Depends(get_plan_service),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get all plans for a specific chat."""
    # Verify chat exists and user owns it
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
    
    plans = plan_service.get_chat_plans(db, chat_id, skip=skip, limit=limit)
    return plans


@router.get("/{plan_id}", response_model=Plan)
def get_plan(
    plan_id: UUID,
    db: Session = Depends(get_db),
    plan_service: PlanService = Depends(get_plan_service),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get a specific plan."""
    plan = plan_service.get_by_id(db, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
    
    # Verify user owns the chat this plan belongs to
    chat = chat_service.get_by_id(db, plan.chat_id)
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
    
    return plan


@router.delete("/{plan_id}")
def delete_plan(
    plan_id: UUID,
    db: Session = Depends(get_db),
    plan_service: PlanService = Depends(get_plan_service),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Delete a plan."""
    plan = plan_service.get_by_id(db, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
    
    # Verify user owns the chat this plan belongs to
    chat = chat_service.get_by_id(db, plan.chat_id)
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
    
    deleted_plan = plan_service.delete(db, plan_id)
    if not deleted_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
    
    return {"message": "Plan deleted successfully"}
