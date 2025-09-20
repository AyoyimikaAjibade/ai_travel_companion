"""
Booking management API endpoints.
"""

from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID

from dependencies import get_db, get_booking_service
from services.booking_service import BookingService
from models.booking import BookingReference, BookingReferenceCreate, BookingReferenceUpdate, BookingStatus
from core.security import get_current_active_user
from models.user import User

router = APIRouter()


@router.get("/", response_model=List[BookingReference])
def get_user_bookings(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    status_filter: Optional[BookingStatus] = Query(None),
    db: Session = Depends(get_db),
    booking_service: BookingService = Depends(get_booking_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get all bookings for the current user."""
    if status_filter:
        bookings = booking_service.get_user_bookings_by_status(db, current_user.id, status_filter)
    else:
        bookings = booking_service.get_user_bookings(db, current_user.id, skip=skip, limit=limit)
    
    return bookings


@router.post("/", response_model=BookingReference)
def create_booking(
    booking_in: BookingReferenceCreate,
    db: Session = Depends(get_db),
    booking_service: BookingService = Depends(get_booking_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Create a new booking reference."""
    # Ensure the booking is created for the current user
    booking_data = booking_in.dict()
    booking_data['user_id'] = current_user.id
    
    booking_create = BookingReferenceCreate(**booking_data)
    booking = booking_service.create_booking(db, booking_create)
    return booking


@router.get("/{booking_id}", response_model=BookingReference)
def get_booking(
    booking_id: UUID,
    db: Session = Depends(get_db),
    booking_service: BookingService = Depends(get_booking_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get a specific booking."""
    booking = booking_service.get_by_id(db, booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check if user owns the booking
    if booking.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return booking


@router.put("/{booking_id}", response_model=BookingReference)
def update_booking(
    booking_id: UUID,
    booking_update: BookingReferenceUpdate,
    db: Session = Depends(get_db),
    booking_service: BookingService = Depends(get_booking_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Update a booking."""
    booking = booking_service.get_by_id(db, booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check if user owns the booking
    if booking.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    updated_booking = booking_service.update_booking(db, booking_id, booking_update)
    return updated_booking


@router.delete("/{booking_id}")
def delete_booking(
    booking_id: UUID,
    db: Session = Depends(get_db),
    booking_service: BookingService = Depends(get_booking_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Delete a booking."""
    booking = booking_service.get_by_id(db, booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check if user owns the booking
    if booking.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    deleted_booking = booking_service.delete(db, booking_id)
    if not deleted_booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    return {"message": "Booking deleted successfully"}


@router.post("/{booking_id}/confirm")
def confirm_booking(
    booking_id: UUID,
    confirmation_details: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db),
    booking_service: BookingService = Depends(get_booking_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Confirm a booking."""
    booking = booking_service.get_by_id(db, booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check if user owns the booking
    if booking.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    confirmed_booking = booking_service.confirm_booking(db, booking_id, confirmation_details)
    return {"message": "Booking confirmed successfully", "booking": confirmed_booking}


@router.post("/{booking_id}/cancel")
def cancel_booking(
    booking_id: UUID,
    cancellation_reason: Optional[str] = None,
    db: Session = Depends(get_db),
    booking_service: BookingService = Depends(get_booking_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Cancel a booking."""
    booking = booking_service.get_by_id(db, booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check if user owns the booking
    if booking.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    cancelled_booking = booking_service.cancel_booking(db, booking_id, cancellation_reason)
    return {"message": "Booking cancelled successfully", "booking": cancelled_booking}


@router.get("/reference/{provider}/{reference_code}", response_model=BookingReference)
def get_booking_by_reference(
    provider: str,
    reference_code: str,
    db: Session = Depends(get_db),
    booking_service: BookingService = Depends(get_booking_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get booking by reference code and provider."""
    booking = booking_service.get_booking_by_reference(db, reference_code, provider)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check if user owns the booking
    if booking.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return booking


@router.get("/active/", response_model=List[BookingReference])
def get_active_bookings(
    db: Session = Depends(get_db),
    booking_service: BookingService = Depends(get_booking_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get active bookings for the current user."""
    bookings = booking_service.get_user_active_bookings(db, current_user.id)
    return bookings


@router.get("/stats/")
def get_booking_stats(
    db: Session = Depends(get_db),
    booking_service: BookingService = Depends(get_booking_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get booking statistics for the current user."""
    stats = booking_service.get_booking_stats(db, current_user.id)
    return stats


@router.post("/{booking_id}/retry")
def retry_failed_booking(
    booking_id: UUID,
    db: Session = Depends(get_db),
    booking_service: BookingService = Depends(get_booking_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Retry a failed booking."""
    booking = booking_service.get_by_id(db, booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check if user owns the booking
    if booking.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    if booking.status != BookingStatus.FAILED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only failed bookings can be retried"
        )
    
    retried_booking = booking_service.retry_failed_booking(db, booking_id)
    return {"message": "Booking retry initiated", "booking": retried_booking}


@router.get("/search/")
def search_bookings(
    provider: Optional[str] = Query(None),
    status_filter: Optional[BookingStatus] = Query(None),
    reference_code: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    booking_service: BookingService = Depends(get_booking_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Search user's bookings with filters."""
    search_params = {'user_id': current_user.id}
    
    if provider:
        search_params['provider'] = provider
    if status_filter:
        search_params['status'] = status_filter
    if reference_code:
        search_params['reference_code'] = reference_code
    
    bookings = booking_service.search_bookings(db, search_params, skip=skip, limit=limit)
    return bookings


# Webhook endpoint for external providers (would need special authentication)
@router.post("/webhook/{provider}")
def booking_webhook(
    provider: str,
    webhook_data: Dict[str, Any],
    db: Session = Depends(get_db),
    booking_service: BookingService = Depends(get_booking_service)
) -> Any:
    """Process booking webhook from external provider."""
    # Note: In a real implementation, you would need to verify the webhook
    # signature or use some other authentication mechanism
    
    processed_booking = booking_service.process_booking_webhook(db, provider, webhook_data)
    
    if processed_booking:
        return {"message": "Webhook processed successfully", "booking_id": processed_booking.id}
    else:
        return {"message": "Webhook processed but no booking updated"}
