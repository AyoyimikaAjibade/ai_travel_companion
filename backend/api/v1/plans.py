from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID

from dependencies import get_db, get_plan_service, get_chat_service
from services.plan_service import PlanService
from services.chat_service import ChatService
from models.plan import Plan, PlanWithStatus
from models.chat import ChatStatus
from core.security import get_current_active_user
from models.user import User

router = APIRouter()


@router.get("/{plan_id}/public", response_model=PlanWithStatus)
def get_plan_public(
    plan_id: UUID,
    db: Session = Depends(get_db),
    plan_service: PlanService = Depends(get_plan_service),
    chat_service: ChatService = Depends(get_chat_service)
) -> PlanWithStatus:
    """Get a plan by ID without authentication."""
    plan = plan_service.get_by_id(db, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
    
    chat = chat_service.get_by_id(db, plan.chat_id)
    chat_status = chat.status if chat and chat.status else ChatStatus.DRAFT.value
    
    plan_dict = plan.dict(exclude_none=False) if hasattr(plan, 'dict') else plan.model_dump(exclude_none=False)
    plan_dict['status'] = chat_status
    return PlanWithStatus(**plan_dict)


@router.get("/chat/{chat_id}", response_model=List[PlanWithStatus])
def get_chat_plans(
    chat_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    plan_service: PlanService = Depends(get_plan_service),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> List[PlanWithStatus]:
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
    
    plans = plan_service.get_chat_plans(db, chat_id, skip=skip, limit=limit)
    chat_status = chat.status or ChatStatus.DRAFT.value
    result = []
    for plan in plans:
        plan_dict = plan.dict(exclude_none=False) if hasattr(plan, 'dict') else plan.model_dump(exclude_none=False)
        plan_dict['status'] = chat_status
        result.append(PlanWithStatus(**plan_dict))
    return result


@router.get("/{plan_id}", response_model=PlanWithStatus)
def get_plan(
    plan_id: UUID,
    db: Session = Depends(get_db),
    plan_service: PlanService = Depends(get_plan_service),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> PlanWithStatus:
    plan = plan_service.get_by_id(db, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
    
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
    
    plan_dict = plan.dict(exclude_none=False) if hasattr(plan, 'dict') else plan.model_dump(exclude_none=False)
    plan_dict['status'] = chat.status or ChatStatus.DRAFT.value
    return PlanWithStatus(**plan_dict)


@router.delete("/{plan_id}")
def delete_plan(
    plan_id: UUID,
    db: Session = Depends(get_db),
    plan_service: PlanService = Depends(get_plan_service),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    plan = plan_service.get_by_id(db, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
    
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
