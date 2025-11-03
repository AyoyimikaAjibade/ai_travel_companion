"""
Plan management API endpoints.
"""

from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID

from dependencies import get_db, get_plan_service, get_chat_service
from services.plan_service import PlanService
from services.chat_service import ChatService
from models.plan import Plan, PlanCreate, PlanUpdate
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
    
    if chat.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    plans = plan_service.get_chat_plans(db, chat_id, skip=skip, limit=limit)
    return plans


@router.post("/", response_model=Plan)
def create_plan(
    plan_in: PlanCreate,
    db: Session = Depends(get_db),
    plan_service: PlanService = Depends(get_plan_service),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Create a new plan."""
    # Verify chat exists and user owns it
    chat = chat_service.get_by_id(db, plan_in.chat_id)
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
    
    plan = plan_service.create_plan(db, plan_in)
    return plan


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
    if not chat or chat.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return plan


@router.put("/{plan_id}", response_model=Plan)
def update_plan(
    plan_id: UUID,
    plan_update: PlanUpdate,
    db: Session = Depends(get_db),
    plan_service: PlanService = Depends(get_plan_service),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Update a plan."""
    plan = plan_service.get_by_id(db, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
    
    # Verify user owns the chat this plan belongs to
    chat = chat_service.get_by_id(db, plan.chat_id)
    if not chat or chat.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    updated_plan = plan_service.update_plan(db, plan_id, plan_update)
    return updated_plan


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
    if not chat or chat.user_id != current_user.id:
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


@router.get("/chat/{chat_id}/best", response_model=List[Plan])
def get_best_plans(
    chat_id: UUID,
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    plan_service: PlanService = Depends(get_plan_service),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get best plans for a chat ordered by score."""
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
    
    plans = plan_service.get_best_plans(db, chat_id, limit=limit)
    return plans


@router.get("/chat/{chat_id}/cheapest", response_model=List[Plan])
def get_cheapest_plans(
    chat_id: UUID,
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    plan_service: PlanService = Depends(get_plan_service),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get cheapest plans for a chat."""
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
    
    plans = plan_service.get_cheapest_plans(db, chat_id, limit=limit)
    return plans


@router.get("/chat/{chat_id}/ai-generated", response_model=List[Plan])
def get_ai_generated_plans(
    chat_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    plan_service: PlanService = Depends(get_plan_service),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get AI-generated plans for a chat."""
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
    
    plans = plan_service.get_ai_generated_plans(db, chat_id, skip=skip, limit=limit)
    return plans


@router.get("/chat/{chat_id}/manual", response_model=List[Plan])
def get_manual_plans(
    chat_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    plan_service: PlanService = Depends(get_plan_service),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get manually created plans for a chat."""
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
    
    plans = plan_service.get_manual_plans(db, chat_id, skip=skip, limit=limit)
    return plans


@router.get("/chat/{chat_id}/recommendations", response_model=List[Plan])
def get_plan_recommendations(
    chat_id: UUID,
    db: Session = Depends(get_db),
    plan_service: PlanService = Depends(get_plan_service),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get plan recommendations for a chat based on user preferences."""
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
    
    # Get user preferences (this would be expanded with actual preference logic)
    user_preferences = {
        'max_budget': chat.budget,
        'min_score': 6.0
    }
    
    plans = plan_service.get_plan_recommendations(db, chat_id, user_preferences)
    return plans


@router.post("/compare")
def compare_plans(
    plan_ids: List[UUID],
    db: Session = Depends(get_db),
    plan_service: PlanService = Depends(get_plan_service),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Compare multiple plans."""
    if len(plan_ids) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least 2 plans are required for comparison"
        )
    
    if len(plan_ids) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 5 plans can be compared at once"
        )
    
    # Verify user owns all plans (through chats)
    for plan_id in plan_ids:
        plan = plan_service.get_by_id(db, plan_id)
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plan {plan_id} not found"
            )
        
        chat = chat_service.get_by_id(db, plan.chat_id)
        if not chat or chat.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
    
    comparison = plan_service.compare_plans(db, plan_ids)
    return comparison


@router.put("/{plan_id}/score")
def update_plan_score(
    plan_id: UUID,
    db: Session = Depends(get_db),
    plan_service: PlanService = Depends(get_plan_service),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Recalculate and update plan score."""
    plan = plan_service.get_by_id(db, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
    
    # Verify user owns the chat this plan belongs to
    chat = chat_service.get_by_id(db, plan.chat_id)
    if not chat or chat.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    updated_plan = plan_service.update_plan_score(db, plan_id)
    return {"message": "Plan score updated successfully", "plan": updated_plan}


@router.get("/search/")
def search_plans(
    chat_id: Optional[UUID] = Query(None),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    min_score: Optional[float] = Query(None, ge=0, le=10),
    max_score: Optional[float] = Query(None, ge=0, le=10),
    has_flight: Optional[bool] = Query(None),
    has_hotel: Optional[bool] = Query(None),
    has_car: Optional[bool] = Query(None),
    ai_generated: Optional[bool] = Query(None),
    manual: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    plan_service: PlanService = Depends(get_plan_service),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Search plans with filters."""
    search_params = {}
    
    if chat_id:
        # Verify user owns the chat
        chat = chat_service.get_by_id(db, chat_id)
        if not chat or chat.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        search_params['chat_id'] = chat_id
    
    if min_price:
        search_params['min_price'] = min_price
    if max_price:
        search_params['max_price'] = max_price
    if min_score:
        search_params['min_score'] = min_score
    if max_score:
        search_params['max_score'] = max_score
    if has_flight is not None:
        search_params['has_flight'] = has_flight
    if has_hotel is not None:
        search_params['has_hotel'] = has_hotel
    if has_car is not None:
        search_params['has_car'] = has_car
    if ai_generated is not None:
        search_params['ai_generated'] = ai_generated
    if manual is not None:
        search_params['manual'] = manual
    
    plans = plan_service.search_plans(db, search_params, skip=skip, limit=limit)
    return plans

