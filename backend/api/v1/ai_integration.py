"""
AI service integration - Persistence endpoint for AI service.

This module handles:
- Persisting chat data (chats, messages, plans) when called by the AI service
- Creating/updating Chat records
- Persisting ChatMessage records
- Creating Plan records when travel plans are generated
"""

import logging
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
from models.chat import ChatCreate
from models.chat_message import ChatMessageCreate
from models.user import User
from services.chat_message_service import ChatMessageService
from services.chat_service import ChatService
from services.plan_service import PlanService

# Configure logging
logger = logging.getLogger(__name__)

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
        logger.warning(f"Error calculating car total price: {e}")
    
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
        logger.debug("Insufficient data to create chat record")
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
        user_info = f"user {user_id}" if user_id else "anonymous user"
        logger.info(f"Created chat {chat.id} for {user_info}")
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
        
        logger.debug(f"Persisted messages for chat {chat_id}")
    
    except Exception as e:
        logger.error(f"Error persisting chat messages: {e}", exc_info=True)
        # Don't raise - message persistence failure shouldn't break the flow


def _get_latest_plan_for_slot(
    db: Session, plan_service: PlanService, chat_id: UUID, slot_id: str
) -> Optional[Dict[str, Any]]:
    """
    Get the most recent plan for a chat/slot_id to preserve previous plan data.
    
    Args:
        db: Database session
        plan_service: Plan service instance
        chat_id: Chat ID
        slot_id: Slot ID
    
    Returns:
        Latest plan data as dict, or None if no plan exists
    """
    try:
        plans = plan_service.get_chat_plans(db, chat_id, skip=0, limit=1)
        if plans:
            latest_plan = plans[0]
            return {
                "flight_data": latest_plan.flight_data,
                "hotel_data": latest_plan.hotel_data,
                "car_data": latest_plan.car_data,
                "attractions_data": latest_plan.attractions_data,
            }
    except Exception as e:
        logger.warning(f"Could not retrieve latest plan: {e}")
    
    return None


def _merge_plan_data(
    previous_plan: Optional[Dict[str, Any]], ai_response: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Merge previous plan data with new AI response data.
    Preserves previous data when new data is missing.
    
    Args:
        previous_plan: Previous plan data (flight, hotel, car, attractions)
        ai_response: New AI service response
    
    Returns:
        Merged plan components
    """
    # Extract new components from AI response
    new_flight = ai_response.get("flight")
    new_hotel = ai_response.get("hotel")
    new_car = ai_response.get("car")
    new_attractions = ai_response.get("attractions") or []
    
    # Use previous data if new data is missing
    flight = new_flight if new_flight else (previous_plan.get("flight_data") if previous_plan else None)
    hotel = new_hotel if new_hotel else (previous_plan.get("hotel_data") if previous_plan else None)
    car = new_car if new_car else (previous_plan.get("car_data") if previous_plan else None)
    
    # Merge attractions: combine previous and new, avoiding duplicates
    previous_attractions = previous_plan.get("attractions_data") if previous_plan else None
    if isinstance(previous_attractions, dict) and "items" in previous_attractions:
        # Previous format: {"items": [...]}
        prev_attrs = previous_attractions.get("items", [])
    elif isinstance(previous_attractions, list):
        # Previous format: [...]
        prev_attrs = previous_attractions
    else:
        prev_attrs = []
    
    # Combine attractions, avoiding duplicates by name
    seen_names = {attr.get("name") for attr in prev_attrs if isinstance(attr, dict)}
    merged_attractions = list(prev_attrs)
    for attr in new_attractions:
        if isinstance(attr, dict) and attr.get("name") not in seen_names:
            merged_attractions.append(attr)
            seen_names.add(attr.get("name"))
    
    return {
        "flight": flight or {},
        "hotel": hotel or {},
        "car": car or {},
        "attractions": merged_attractions,
    }


def _create_plan_from_ai_response(
    db: Session,
    plan_service: PlanService,
    chat_id: UUID,
    slot_id: str,
    ai_response: Dict[str, Any],
    returned_slots: Dict[str, Any],
) -> None:
    """
    Create a Plan record from AI service TravelOptionsResponse.
    Merges with previous plan data if available to preserve flight/hotel/car data.
    
    Args:
        db: Database session
        plan_service: Plan service instance
        chat_id: Chat ID
        slot_id: Slot ID
        ai_response: AI service response (TravelOptionsResponse)
        returned_slots: Slots from AI response (for date calculation)
    """
    try:
        # Get previous plan data to preserve flight/hotel/car if AI only searched for new items
        previous_plan = _get_latest_plan_for_slot(db, plan_service, chat_id, slot_id)
        
        # Merge previous plan data with new AI response
        merged_components = _merge_plan_data(previous_plan, ai_response)
        
        flight = merged_components["flight"]
        hotel = merged_components["hotel"]
        car = merged_components["car"]
        attractions = merged_components["attractions"]
        
        # Get dates for car price calculation
        # Try to get dates from returned_slots (ParseResponse) or reconstruct from request
        dates = returned_slots.get("dates", {})
        start_date_str = dates.get("start")
        end_date_str = dates.get("end")
        
        # If dates not in returned_slots (TravelOptionsResponse), try to extract from flight data
        if not start_date_str and ai_response.get("flight"):
            flight_departure = ai_response.get("flight", {}).get("departure_time")
            if flight_departure:
                try:
                    # Extract date from ISO datetime string
                    dt = datetime.fromisoformat(flight_departure.replace('Z', '+00:00'))
                    start_date_str = dt.strftime("%Y-%m-%d")
                except Exception:
                    pass
        
        # Calculate total price
        total_price = _calculate_plan_total_price(
            flight, hotel, car, attractions, start_date_str, end_date_str
        )
        
        # Convert attractions list to dict format for Plan model
        # Plan model expects Dict[str, Any], so we store as {"items": [...]}
        attractions_data = {"items": attractions} if attractions else None
        
        # Create plan payload
        plan_payload = {
            "total_price": total_price,
            "score": None,
            "explanation": ai_response.get("reply") or "AI-generated travel plan",
            "flight_data": flight if flight else None,
            "hotel_data": hotel if hotel else None,
            "car_data": car if car else None,
            "attractions_data": attractions_data,  # Now a dict, not a list
            "deeplinks": {"ai_plan_id": ai_response.get("plan_id")},
            "ai_generated": True,
            "manual": False,
        }
        
        # Calculate score if available
        try:
            plan_payload["score"] = plan_service.calculate_plan_score(plan_payload)
        except Exception as e:
            logger.warning(f"Could not calculate plan score: {e}")
            plan_payload["score"] = None
        
        # Persist plan
        plan_service.confirm_plan(db, chat_id, slot_id, plan_payload)
        logger.info(f"Created plan for chat {chat_id} with plan_id {ai_response.get('plan_id')}")
    
    except Exception as e:
        logger.error(f"Error creating plan from AI response: {e}", exc_info=True)
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
    """
    Persist chat data endpoint - called by AI service after generating response.
    
    This endpoint allows the AI service to persist chat, messages, and plans
    to the database after processing a user request.
    
    Request body:
    - user_id: UUID (optional) - User ID if authenticated
    - chat_id: UUID (optional) - Existing chat ID
    - current_slots: dict (optional) - Original current_slots from request
    - returned_slots: dict (required) - Slots from AI response
    - slot_id: str (required) - Final slot_id
    - message: str (required) - User's message
    - ai_response: dict (required) - Full AI service response
    - is_complete_plan: bool (required) - Whether this is a complete plan response
    
    Returns:
        Success response with persisted data IDs
    """
    try:
        # Extract parameters from request
        user_id_str = request_data.get("user_id")
        chat_id_str = request_data.get("chat_id")
        current_slots = request_data.get("current_slots")
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
        
        # Parse user_id and chat_id if provided
        user_id = None
        if user_id_str:
            try:
                user_id = UUID(str(user_id_str))
            except (ValueError, TypeError):
                logger.warning(f"Invalid user_id format: {user_id_str}")
                # If provided user_id is invalid, try to use current_user
                user_id = current_user.id if current_user else None
        
        # If no user_id in request but we have authenticated user, use it
        if not user_id and current_user:
            user_id = current_user.id
        
        chat_id = None
        if chat_id_str:
            try:
                chat_id = UUID(str(chat_id_str))
            except (ValueError, TypeError):
                logger.warning(f"Invalid chat_id format: {chat_id_str}")
                chat_id = None
        
        # Validate chat ownership if chat_id provided
        if chat_id and user_id:
            chat = chat_service.get_by_id(db, chat_id)
            if chat and chat.user_id and chat.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Chat does not belong to this user"
                )
        
        # Get or create chat record
        chat = None
        final_chat_id = chat_id
        
        if chat_id:
            chat = chat_service.get_by_id(db, chat_id)
        
        # Update existing chat with latest data from current_slots
        if chat:
            # Determine which current_slots to use
            if is_complete_plan:
                slots_for_update = current_slots if current_slots else {}
            else:
                slots_for_update = returned_slots if returned_slots else {}
            
            # Ensure slot_id is in slots_for_update if we have it
            if slot_id and slots_for_update and isinstance(slots_for_update, dict):
                slots_for_update["slot_id"] = slot_id
            
            # Extract individual fields from current_slots and update chat
            if slots_for_update:
                chat_fields = _extract_chat_fields_from_slots(slots_for_update)
                if chat_fields:
                    from models.chat import ChatUpdate
                    chat_update = ChatUpdate(**chat_fields)
                    chat = chat_service.update_chat(db, chat_id, chat_update)
                    logger.info(f"Updated chat {chat_id} with fields from current_slots")
        
        # Create chat if it doesn't exist and we have minimum required data
        if not chat:
            if is_complete_plan:
                slots_for_chat = current_slots if current_slots else {}
                if not slots_for_chat and slot_id:
                    slots_for_chat = {"slot_id": slot_id}
            else:
                slots_for_chat = returned_slots if returned_slots else {}
            
            if slot_id and slots_for_chat and isinstance(slots_for_chat, dict):
                slots_for_chat["slot_id"] = slot_id
            
            final_chat_id = _create_chat_from_slots(
                db, chat_service, user_id, slots_for_chat, slot_id
            )
            
            if final_chat_id:
                logger.info(f"Created chat {final_chat_id} for {'user ' + str(user_id) if user_id else 'anonymous user'}")
        
        # Persist messages if we have chat_id and slot_id
        persisted_plan_id = None
        if final_chat_id and slot_id:
            _persist_chat_messages(
                db, chat_message_service, final_chat_id, slot_id, message, ai_response
            )
            
            # Create plan if AI service returned a complete travel plan
            if ai_response.get("plan_id"):
                _create_plan_from_ai_response(
                    db, plan_service, final_chat_id, slot_id, ai_response, returned_slots
                )
                persisted_plan_id = ai_response.get("plan_id")
                logger.info(f"Created plan for chat {final_chat_id}")
        
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
        logger.error(f"Error persisting chat data: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist chat data: {str(e)}"
        )
