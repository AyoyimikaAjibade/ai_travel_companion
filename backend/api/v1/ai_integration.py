"""
AI service integration endpoints for handling chat flows and plan generation.
"""

from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from uuid import UUID
import httpx

from dependencies import get_db, get_chat_service, get_plan_service, get_chat_message_service
from services.chat_service import ChatService
from services.plan_service import PlanService
from services.chat_message_service import ChatMessageService
from core.security import get_current_active_user
from models.user import User
from core.config import settings
from core.cache import cache_service

router = APIRouter()

# AI Service base URL from config
AI_SERVICE_BASE_URL = settings.AI_SERVICE_BASE_URL


@router.post("/chat/parse")
async def parse_chat_message(
    request_data: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
    chat_message_service: ChatMessageService = Depends(get_chat_message_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Parse user chat message using AI service.
    This endpoint acts as a proxy to the AI service and caches the response.
    
    Request body:
    - message: str (required) - User's chat message
    - current_slots: dict (optional) - Current slot values from previous interactions
    - chat_id: UUID (optional) - Existing chat ID
    - slot_id: str (optional) - AI service slot_id
    """
    try:
        # Extract data from request
        message = request_data.get("message")
        if not message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message is required"
            )
        
        current_slots = request_data.get("current_slots")
        chat_id = request_data.get("chat_id")
        if chat_id:
            try:
                chat_id = UUID(str(chat_id))
            except (ValueError, TypeError):
                chat_id = None
        
        slot_id = request_data.get("slot_id")
        
        # Call AI service
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{AI_SERVICE_BASE_URL}/chat",
                json={
                    "message": message,
                    "current_slots": current_slots
                }
            )
            response.raise_for_status()
            ai_response = response.json()
        
        # Extract slot_id from response if not provided
        returned_slots = ai_response.get("current_slots", {})
        if not slot_id and returned_slots.get("slot_id"):
            slot_id = returned_slots.get("slot_id")
        
        # Create or get chat record if needed
        chat = None
        if not chat_id and slot_id:
            # Try to find existing chat by slot_id
            chat = chat_service.get_chat_by_slot_id(db, slot_id)
            
            if not chat:
                # Only create chat if we have minimum required data
                from datetime import date
                dates = returned_slots.get("dates", {})
                start_date_str = dates.get("start")
                end_date_str = dates.get("end")
                
                # Only create chat if we have destination and dates
                if returned_slots.get("destination_airport_code") and start_date_str and end_date_str:
                    try:
                        from models.chat import ChatCreate
                        chat_create = ChatCreate(
                            slot_id=slot_id,
                            origin_code=returned_slots.get("origin_airport_code", "TBD"),
                            origin_name=returned_slots.get("origin_city_name") or returned_slots.get("origin_airport_code", "TBD"),
                            destination_code=returned_slots.get("destination_airport_code", ""),
                            destination_name=returned_slots.get("destination_city_name") or returned_slots.get("destination_city_code", ""),
                            start_date=date.fromisoformat(start_date_str),
                            end_date=date.fromisoformat(end_date_str),
                            adults=returned_slots.get("pax", {}).get("adults", 1),
                            budget=returned_slots.get("budget"),
                            status="draft"
                        )
                        chat = chat_service.create_chat(db, current_user.id, chat_create)
                        chat_id = chat.id
                    except (ValueError, KeyError) as e:
                        # If date parsing fails, don't create chat yet
                        pass
        
        # Save messages and session data to cache
        final_chat_id = chat_id or (chat.id if chat else None)
        final_slot_id = slot_id or returned_slots.get("slot_id")
        
        if final_chat_id and final_slot_id:
            # Save user message
            chat_message_service.save_message_to_cache(
                chat_id=final_chat_id,
                slot_id=final_slot_id,
                role="user",
                content=message
            )
            
            # Save AI response message
            missing_fields = ai_response.get("missing", [])
            bot_message = f"Missing information: {', '.join(missing_fields)}" if missing_fields else "All information collected!"
            
            chat_message_service.save_message_to_cache(
                chat_id=final_chat_id,
                slot_id=final_slot_id,
                role="bot",
                content=bot_message,
                ai_response_data=ai_response
            )
            
            # Save session data to cache
            cache_service.save_chat_session(
                str(final_chat_id),
                final_slot_id,
                {
                    "current_slots": returned_slots,
                    "missing": missing_fields,
                    "status": "active"
                }
            )
        
        return {
            "chat_id": str(final_chat_id) if final_chat_id else None,
            "slot_id": final_slot_id or returned_slots.get("slot_id"),
            "current_slots": returned_slots,
            "missing": missing_fields,
            "ready_for_search": len(missing_fields) == 0
        }
    
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service unavailable: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing chat message: {str(e)}"
        )


@router.post("/chat/search")
async def search_travel_options(
    request_data: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    plan_service: PlanService = Depends(get_plan_service),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Search for travel options using AI service and save plans to Redis cache.
    Called when all required information is collected.
    
    Request body:
    - chat_id: UUID (required) - Chat ID
    - slot_id: str (required) - AI service slot_id
    """
    # Extract data from request
    chat_id = request_data.get("chat_id")
    slot_id = request_data.get("slot_id")
    
    if not chat_id or not slot_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="chat_id and slot_id are required"
        )
    
    try:
        chat_id = UUID(str(chat_id))
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid chat_id format"
        )
    
    # Verify chat ownership
    chat = chat_service.get_by_id(db, chat_id)
    if not chat or chat.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Get current slots from cache
    session_data = cache_service.get_chat_session(str(chat_id), slot_id)
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    current_slots = session_data.get("current_slots", {})
    
    try:
        # Call AI service search endpoint
        # Pass current_slots as dict - AI service will handle validation
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{AI_SERVICE_BASE_URL}/search",
                json=current_slots
            )
            response.raise_for_status()
            search_results = response.json()
        
        # Create plan data from search results
        plan_data = {
            "total_price": (
                (search_results.get("flight", {}).get("price") or 0) +
                (search_results.get("hotel", {}).get("total_price") or 0) +
                sum(attr.get("price", 0) for attr in search_results.get("attractions", []))
            ),
            "flight_data": search_results.get("flight"),
            "hotel_data": search_results.get("hotel"),
            "car_data": search_results.get("car"),
            "attractions_data": search_results.get("attractions", []),
            "deeplinks": {},
            "ai_generated": True,
            "manual": False,
            "score": None  # Will be calculated later
        }
        
        # Calculate score
        plan_data["score"] = plan_service.calculate_plan_score(plan_data)
        
        # Save to Redis cache
        plan_service.create_plan_draft(chat_id, slot_id, plan_data)
        
        return {
            "message": "Travel plan generated and saved to cache",
            "chat_id": str(chat_id),
            "slot_id": slot_id,
            "plan": plan_data
        }
    
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service unavailable: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching travel options: {str(e)}"
        )


@router.get("/chat/{chat_id}/drafts")
def get_draft_plans(
    chat_id: UUID,
    slot_id: Optional[str] = None,
    db: Session = Depends(get_db),
    plan_service: PlanService = Depends(get_plan_service),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get all draft plans from Redis cache for a chat."""
    # Verify chat ownership
    chat = chat_service.get_by_id(db, chat_id)
    if not chat or chat.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    if slot_id:
        plan = plan_service.get_plan_draft(chat_id, slot_id)
        return {"plans": [plan] if plan else []}
    else:
        plans = plan_service.get_all_draft_plans(chat_id)
        return {"plans": plans}


@router.put("/chat/{chat_id}/drafts/{slot_id}")
def update_draft_plan(
    chat_id: UUID,
    slot_id: str,
    plan_updates: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    plan_service: PlanService = Depends(get_plan_service),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Update a draft plan in Redis cache."""
    # Verify chat ownership
    chat = chat_service.get_by_id(db, chat_id)
    if not chat or chat.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Get existing plan
    existing_plan = plan_service.get_plan_draft(chat_id, slot_id)
    if not existing_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft plan not found"
        )
    
    # Merge updates
    updated_plan = {**existing_plan, **plan_updates}
    updated_plan["manual"] = True  # Mark as manually edited
    
    # Recalculate score
    updated_plan["score"] = plan_service.calculate_plan_score(updated_plan)
    
    # Save back to cache
    plan_service.update_plan_draft(chat_id, slot_id, updated_plan)
    
    return {
        "message": "Draft plan updated",
        "plan": updated_plan
    }


@router.post("/chat/{chat_id}/confirm")
def confirm_chat_and_plans(
    chat_id: UUID,
    request_data: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
    plan_service: PlanService = Depends(get_plan_service),
    chat_message_service: ChatMessageService = Depends(get_chat_message_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Confirm and save all plans and chat messages from Redis cache to PostgreSQL.
    This is called when the user confirms the final plan.
    
    Request body:
    - slot_ids: List[str] (required) - List of slot_ids to confirm
    """
    # Extract slot_ids from request
    slot_ids = request_data.get("slot_ids", [])
    if isinstance(slot_ids, str):
        slot_ids = [slot_ids]
    
    if not slot_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="slot_ids are required"
        )
    
    # Verify chat ownership
    chat = chat_service.get_by_id(db, chat_id)
    if not chat or chat.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    confirmed_plans = []
    confirmed_messages = []
    
    try:
        # Confirm all plans and messages for each slot
        for slot_id in slot_ids:
            # Get draft plan for this slot
            draft_plan = plan_service.get_plan_draft(chat_id, slot_id)
            if draft_plan:
                # Confirm plan from cache to database
                plan = plan_service.confirm_plan(db, chat_id, slot_id, draft_plan)
                if plan:
                    confirmed_plans.append(plan)
            
            # Confirm messages for this slot
            messages = chat_message_service.confirm_messages(db, chat_id, slot_id)
            confirmed_messages.extend(messages)
            
            # Clear session cache for this slot
            cache_service.delete_chat_session(str(chat_id), slot_id)
        
        # Update chat status if plans were confirmed
        if confirmed_plans:
            chat_service.change_chat_status(db, chat_id, "confirmed")
        
        return {
            "message": "Chat and plans confirmed and saved to database",
            "chat_id": str(chat_id),
            "confirmed_plans_count": len(confirmed_plans),
            "confirmed_messages_count": len(confirmed_messages),
            "plans": [{"id": str(p.id), "total_price": p.total_price, "score": p.score, "ai_generated": p.ai_generated, "manual": p.manual} for p in confirmed_plans]
        }
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error confirming chat: {str(e)}"
        )

