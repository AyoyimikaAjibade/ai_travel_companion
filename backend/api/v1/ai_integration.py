"""
AI service integration - Persistence endpoint for AI service.

This module handles:
- Persisting chat data (chats, messages, plans) when called by the AI service
- Creating/updating Chat records
- Persisting ChatMessage records
- Creating Plan records when travel plans are generated
"""

from datetime import date, datetime
from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.security import get_current_user_optional
from dependencies import (
    get_chat_message_service,
    get_chat_service,
    get_db,
    get_plan_service,
)
from models.chat import ChatCreate, ChatStatus
from models.chat_message import ChatMessageCreate
from models.user import User
from services.chat_message_service import ChatMessageService
from services.chat_service import ChatService
from services.plan_service import PlanService

router = APIRouter()


# ============================================================================
# Helper Functions
# ============================================================================

def _calculate_car_total_price(
    car_data: Dict[str, Any], start_date_str: Optional[str], end_date_str: Optional[str]
) -> float:
    """
    Calculate total car rental price based on trip duration.
    
    Args:
        car_data: Car option data with price_per_day
        start_date_str: Trip start date (ISO format)
        end_date_str: Trip end date (ISO format)
    
    Returns:
        Total car rental price, or 0 if calculation not possible
    """
    if not car_data or not start_date_str or not end_date_str:
        return 0.0
    
    price_per_day = car_data.get("price_per_day")
    if not isinstance(price_per_day, (int, float)):
        return 0.0
    
    try:
        start_date = date.fromisoformat(start_date_str)
        end_date = date.fromisoformat(end_date_str)
        days = (end_date - start_date).days
        if days > 0:
            return float(price_per_day) * days
    except (ValueError, TypeError) as e:
        pass
    
    return 0.0


def _calculate_plan_total_price(
    flight: Dict[str, Any],
    hotel: Dict[str, Any],
    car: Dict[str, Any],
    attractions: list,
    start_date_str: Optional[str] = None,
    end_date_str: Optional[str] = None,
) -> float:
    """
    Calculate total plan price from all components.
    
    Args:
        flight: Flight option data
        hotel: Hotel option data
        car: Car option data
        attractions: List of attraction options (or dict with "items" key)
        start_date_str: Trip start date for car calculation
        end_date_str: Trip end date for car calculation
    
    Returns:
        Total price rounded to 2 decimal places
    """
    total = 0.0
    
    # Flight price
    if isinstance(flight.get("price"), (int, float)):
        total += float(flight.get("price"))
    
    # Hotel total price
    if isinstance(hotel.get("total_price"), (int, float)):
        total += float(hotel.get("total_price"))
    
    # Car total price (calculated from price_per_day * days)
    if car:
        car_total = _calculate_car_total_price(car, start_date_str, end_date_str)
        total += car_total
    
    # Attractions prices - handle both list and dict formats
    attrs_list = attractions
    if isinstance(attractions, dict) and "items" in attractions:
        attrs_list = attractions.get("items", [])
    elif not isinstance(attractions, list):
        attrs_list = []
    
    for attr in attrs_list or []:
        if isinstance(attr, dict) and isinstance(attr.get("price"), (int, float)):
            total += float(attr.get("price"))
    
    return round(total, 2)


def _extract_chat_fields_from_slots(slots: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract individual chat fields from current_slots dictionary.
    
    Args:
        slots: Current slots dictionary from AI service
    
    Returns:
        Dictionary with individual chat fields
    """
    if not slots:
        return {}
    
    dates = slots.get("dates", {})
    pax = slots.get("pax", {})
    hotel = slots.get("hotel", {})
    
    chat_fields = {}
    
    # Extract all available fields
    if slots.get("slot_id"):
        chat_fields["slot_id"] = slots.get("slot_id")
    if slots.get("origin_airport_code"):
        chat_fields["origin_code"] = slots.get("origin_airport_code")
    if slots.get("origin_city_name"):
        chat_fields["origin_name"] = slots.get("origin_city_name")
    elif slots.get("origin_airport_code"):
        chat_fields["origin_name"] = slots.get("origin_airport_code")
    if slots.get("destination_airport_code"):
        chat_fields["destination_code"] = slots.get("destination_airport_code")
    if slots.get("destination_city_name"):
        chat_fields["destination_name"] = slots.get("destination_city_name")
        chat_fields["destination_city_name"] = slots.get("destination_city_name")
    elif slots.get("destination_city_code"):
        # Use destination_city_code as fallback for destination_name
        chat_fields["destination_name"] = slots.get("destination_city_code")
    if slots.get("destination_city_code"):
        chat_fields["destination_city_code"] = slots.get("destination_city_code")
    if dates.get("start"):
        try:
            chat_fields["start_date"] = date.fromisoformat(dates.get("start"))
        except (ValueError, TypeError):
            pass
    if dates.get("end"):
        try:
            chat_fields["end_date"] = date.fromisoformat(dates.get("end"))
        except (ValueError, TypeError):
            pass
    if pax.get("adults") is not None:
        chat_fields["adults"] = pax.get("adults", 1)
    if "kids" in pax and pax.get("kids") is not None:
        chat_fields["kids"] = pax.get("kids", 0)
    if slots.get("budget") is not None:
        chat_fields["budget"] = slots.get("budget")
    if hotel.get("request") is not None:
        chat_fields["hotel_request"] = hotel.get("request")
    if "amenities" in hotel:  # Check if key exists, not if truthy (empty lists are falsy)
        chat_fields["hotel_amenities"] = hotel.get("amenities", [])
    if hotel.get("rating") is not None:
        chat_fields["hotel_rating"] = hotel.get("rating")
    if slots.get("car") is not None:
        chat_fields["car"] = slots.get("car")
    if "attractions" in slots:  # Check if key exists, not if truthy (empty lists are falsy)
        chat_fields["attractions"] = slots.get("attractions", [])
    
    return chat_fields


def _create_chat_from_slots(
    db: Session,
    chat_service: ChatService,
    user_id: Optional[UUID],
    returned_slots: Dict[str, Any],
    slot_id: Optional[str],
) -> Optional[UUID]:
    """
    Create a Chat record from AI service slots if minimum required data is available.
    
    Args:
        db: Database session
        chat_service: Chat service instance
        user_id: User ID (None for anonymous/unauthenticated users)
        returned_slots: Slots from AI service response
        slot_id: Slot ID from AI service
    
    Returns:
        Chat ID if created, None otherwise
    """
    dates = returned_slots.get("dates", {})
    start_date_str = dates.get("start")
    end_date_str = dates.get("end")
    destination_code = returned_slots.get("destination_airport_code")
    
    # Only create chat if we have essential information
    if not (destination_code and start_date_str and end_date_str):
        return None
    
    try:
        # Extract nested values from current_slots
        pax = returned_slots.get("pax", {})
        hotel = returned_slots.get("hotel", {})
        
        chat_create = ChatCreate(
            slot_id=slot_id or returned_slots.get("slot_id"),
            origin_code=returned_slots.get("origin_airport_code") or "TBD",
            origin_name=returned_slots.get("origin_city_name")
            or returned_slots.get("origin_airport_code")
            or "TBD",
            destination_code=destination_code,
            destination_name=returned_slots.get("destination_city_name")
            or returned_slots.get("destination_city_code")
            or destination_code,
            destination_city_name=returned_slots.get("destination_city_name"),
            destination_city_code=returned_slots.get("destination_city_code"),
            start_date=date.fromisoformat(start_date_str),
            end_date=date.fromisoformat(end_date_str),
            adults=pax.get("adults") if pax.get("adults") is not None else 1,
            kids=pax.get("kids") if pax.get("kids") is not None else 0,
            budget=returned_slots.get("budget"),
            hotel_request=hotel.get("request"),
            hotel_amenities=hotel.get("amenities", []),
            hotel_rating=hotel.get("rating"),
            car=returned_slots.get("car"),
            attractions=returned_slots.get("attractions", []),
            status="draft",
        )
        
        chat = chat_service.create_chat(db, user_id, chat_create)
        return chat.id
    
    except (ValueError, KeyError, TypeError) as e:
        logger.warning(f"Could not create chat from AI response: {e}")
        return None


def _persist_chat_messages(
    db: Session,
    chat_message_service: ChatMessageService,
    chat_id: UUID,
    slot_id: str,
    user_message: str,
    ai_response: Dict[str, Any],
) -> None:
    """
    Persist user message and AI reply to database.
    
    Args:
        db: Database session
        chat_message_service: Chat message service instance
        chat_id: Chat ID
        slot_id: Slot ID
        user_message: User's message
        ai_response: AI service response
    """
    try:
        # Save user message
        chat_message_service.create_message(
            db,
            ChatMessageCreate(
                chat_id=chat_id,
                slot_id=slot_id,
                role="user",
                content=user_message,
                message_metadata=None,
                ai_response_data=None,
            ),
        )
        
        # Save AI reply
        ai_reply = ai_response.get("reply") or ""
        if not isinstance(ai_reply, str):
            ai_reply = str(ai_reply) if ai_reply else ""
        
        chat_message_service.create_message(
            db,
            ChatMessageCreate(
                chat_id=chat_id,
                slot_id=slot_id,
                role="bot",
                content=ai_reply,
                message_metadata=None,
                ai_response_data=ai_response,
            ),
        )
    
    except Exception as e:
        pass
        # Don't raise - message persistence failure shouldn't break the flow


def _create_plan_from_ai_response(
    db: Session,
    plan_service: PlanService,
    chat_service: ChatService,
    chat_id: UUID,
    slot_id: str,
    ai_response: Dict[str, Any],
    returned_slots: Dict[str, Any],
) -> None:
    """
    Create a new Plan record from AI service TravelOptionsResponse.
    Always creates a new plan (tracks multiple plans per chat when slots/messages change).
    
    Args:
        db: Database session
        plan_service: Plan service instance
        chat_id: Chat ID
        slot_id: Slot ID
        ai_response: AI service response (TravelOptionsResponse)
        returned_slots: Slots from AI response (for date calculation)
    """
    try:
        # Extract plan components directly from AI response (don't merge with previous)
        flight = ai_response.get("flight")
        hotel = ai_response.get("hotel")
        car = ai_response.get("car")
        attractions = ai_response.get("attractions") or []
        
        # Get dates for car price calculation
        dates = returned_slots.get("dates", {})
        start_date_str = dates.get("start")
        end_date_str = dates.get("end")
        
        # If dates not in returned_slots, try to extract from flight data
        if not start_date_str and flight:
            flight_departure = flight.get("departure_time")
            if flight_departure:
                try:
                    dt = datetime.fromisoformat(flight_departure.replace('Z', '+00:00'))
                    start_date_str = dt.strftime("%Y-%m-%d")
                except Exception:
                    pass
        
        # Calculate total price from current plan components
        total_price = _calculate_plan_total_price(
            flight or {}, hotel or {}, car or {}, attractions, start_date_str, end_date_str
        )
        
        attractions_payload = {"items": attractions} if attractions else None
        
        plan_payload = {
            "total_price": total_price,
            "score": None,
            "explanation": ai_response.get("reply") or "AI-generated travel plan",
            "flight": flight if flight else None,
            "hotel": hotel if hotel else None,
            "car": car if car else None,
            "attractions": attractions_payload,
            "deeplinks": {"ai_plan_id": ai_response.get("plan_id")},
            "ai_generated": True,
            "manual": False,
        }
        
        # Calculate score if available
        try:
            plan_payload["score"] = plan_service.calculate_plan_score(plan_payload)
        except Exception as e:
            pass
            plan_payload["score"] = None
        
        # Create new plan (always creates, tracks multiple plans per chat)
        plan_service.confirm_plan(db, chat_id, slot_id, plan_payload)
        
        # Update chat status to booked when plan is created
        try:
            chat = chat_service.get_by_id(db, chat_id)
            if chat and (not chat.status or chat.status == ChatStatus.DRAFT.value):
                chat_service.change_chat_status(db, chat_id, ChatStatus.BOOKED.value)
        except Exception:
            pass
    
    except Exception as e:
        pass
        # Don't raise - plan creation failure shouldn't break the chat flow


# ============================================================================
# API Endpoints
# ============================================================================


@router.post("/persist-chat")
async def persist_chat_data(
    request_data: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
    chat_message_service: ChatMessageService = Depends(get_chat_message_service),
    plan_service: PlanService = Depends(get_plan_service),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    try:
        # Extract and validate required parameters
        returned_slots = request_data.get("returned_slots", {})
        slot_id = request_data.get("slot_id")
        message = request_data.get("message")
        ai_response = request_data.get("ai_response", {})
        is_complete_plan = request_data.get("is_complete_plan", False)
        
        # Validate required fields
        if not returned_slots:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="returned_slots is required"
            )
        if not slot_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="slot_id is required"
            )
        if not message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="message is required"
            )
        if not ai_response:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ai_response is required"
            )
        
        # Extract user_id: prioritize request body, fallback to authenticated user
        user_id = None
        user_id_str = request_data.get("user_id")
        if user_id_str:
            try:
                user_id = UUID(str(user_id_str))
            except (ValueError, TypeError):
                pass
        
        # Use authenticated user if user_id not in request
        if not user_id and current_user:
            user_id = current_user.id
        
        # Find existing chat by slot_id (primary lookup method)
        # If slot_id matches, we update existing chat instead of creating new one
        chat = chat_service.get_chat_by_slot_id(db, slot_id)
        
        # If chat found by slot_id, validate and handle ownership
        if chat:
            # If both chat and request have user_id, they must match
            if chat.user_id and user_id and chat.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Chat does not belong to this user"
                )
            # If chat has no user_id but request has user_id, we'll update chat with user_id (upgrade anonymous to authenticated)
            # If chat has user_id but request doesn't, we'll allow update but keep existing user_id
        
        
        # Prepare slots data for chat update/creation
        slots_for_chat = returned_slots if returned_slots else request_data.get("current_slots", {})
        if slot_id and isinstance(slots_for_chat, dict):
            slots_for_chat["slot_id"] = slot_id
        
        # Update existing chat or create new one
        final_chat_id = None
        if chat:
            # Update existing chat with latest slot data (same slot_id = update, don't recreate)
            chat_fields = _extract_chat_fields_from_slots(slots_for_chat)
            if chat_fields:
                from models.chat import ChatUpdate
                chat_update = ChatUpdate(**chat_fields)
                updated_chat = chat_service.update_chat(db, chat.id, chat_update)
                final_chat_id = updated_chat.id if updated_chat else chat.id
            else:
                final_chat_id = chat.id
            
            # Upgrade anonymous chat to authenticated if user_id provided
            if not chat.user_id and user_id:
                try:
                    chat.user_id = user_id
                    db.commit()
                    db.refresh(chat)
                    final_chat_id = chat.id
                except Exception as e:
                    pass
        else:
            # Create new chat if we have minimum required data
            final_chat_id = _create_chat_from_slots(
                db, chat_service, user_id, slots_for_chat, slot_id
            )
        
        # Persist messages and plans if we have a valid chat_id
        persisted_plan_id = None
        if final_chat_id:
            # Persist user message and AI reply
            _persist_chat_messages(
                db, chat_message_service, final_chat_id, slot_id, message, ai_response
            )
            
            # Create new plan if this is a complete plan response
            # Each plan change creates a new plan record (tracks multiple plans per chat)
            if is_complete_plan and ai_response.get("plan_id"):
                _create_plan_from_ai_response(
                    db, plan_service, chat_service, final_chat_id, slot_id, ai_response, returned_slots
                )
                persisted_plan_id = ai_response.get("plan_id")
        
        return {
            "success": True,
            "chat_id": str(final_chat_id) if final_chat_id else None,
            "slot_id": slot_id,
            "plan_id": persisted_plan_id,
            "message": "Chat data persisted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist chat data: {str(e)}"
        )
