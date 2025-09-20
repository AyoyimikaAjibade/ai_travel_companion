"""
Booking repository for booking-specific database operations.
"""

from typing import Optional, List
from sqlalchemy.orm import Session
from uuid import UUID

from .base_repository import BaseRepository
from models.booking import BookingReference, BookingStatus


class BookingRepository(BaseRepository[BookingReference]):
    """Repository for BookingReference model operations."""
    
    def __init__(self):
        super().__init__(BookingReference)
    
    def get_user_bookings(self, db: Session, user_id: UUID, skip: int = 0, limit: int = 100) -> List[BookingReference]:
        """Get all bookings for a specific user."""
        return db.query(BookingReference).filter(
            BookingReference.user_id == user_id
        ).offset(skip).limit(limit).all()
    
    def get_bookings_by_status(self, db: Session, status: BookingStatus, skip: int = 0, limit: int = 100) -> List[BookingReference]:
        """Get bookings by status."""
        return db.query(BookingReference).filter(
            BookingReference.status == status
        ).offset(skip).limit(limit).all()
    
    def get_bookings_by_provider(self, db: Session, provider: str, skip: int = 0, limit: int = 100) -> List[BookingReference]:
        """Get bookings by provider."""
        return db.query(BookingReference).filter(
            BookingReference.provider == provider
        ).offset(skip).limit(limit).all()
    
    def get_booking_by_reference(self, db: Session, reference_code: str, provider: str) -> Optional[BookingReference]:
        """Get booking by reference code and provider."""
        return db.query(BookingReference).filter(
            BookingReference.reference_code == reference_code,
            BookingReference.provider == provider
        ).first()
    
    def get_component_bookings(self, db: Session, trip_component_id: UUID) -> List[BookingReference]:
        """Get all bookings for a trip component."""
        return db.query(BookingReference).filter(
            BookingReference.trip_component_id == trip_component_id
        ).all()
    
    def get_user_bookings_by_status(self, db: Session, user_id: UUID, status: BookingStatus) -> List[BookingReference]:
        """Get user bookings filtered by status."""
        return db.query(BookingReference).filter(
            BookingReference.user_id == user_id,
            BookingReference.status == status
        ).all()
    
    def search_bookings(self, db: Session, search_params: dict, skip: int = 0, limit: int = 100) -> List[BookingReference]:
        """Search bookings with various filters."""
        query = db.query(BookingReference)
        
        if 'user_id' in search_params:
            query = query.filter(BookingReference.user_id == search_params['user_id'])
        
        if 'status' in search_params:
            query = query.filter(BookingReference.status == search_params['status'])
        
        if 'provider' in search_params:
            query = query.filter(BookingReference.provider == search_params['provider'])
        
        if 'reference_code' in search_params:
            query = query.filter(
                BookingReference.reference_code.ilike(f"%{search_params['reference_code']}%")
            )
        
        if 'trip_component_id' in search_params:
            query = query.filter(BookingReference.trip_component_id == search_params['trip_component_id'])
        
        return query.offset(skip).limit(limit).all()
    
    def update_booking_status(self, db: Session, booking_id: UUID, status: BookingStatus, details: dict = None) -> Optional[BookingReference]:
        """Update booking status and optionally details."""
        booking = self.get_by_id(db, booking_id)
        if booking:
            booking.status = status
            if details:
                booking.details.update(details)
            db.commit()
            db.refresh(booking)
        return booking
    
    def cancel_booking(self, db: Session, booking_id: UUID, cancellation_details: dict = None) -> Optional[BookingReference]:
        """Cancel a booking."""
        from datetime import datetime
        details = cancellation_details or {}
        details['cancelled_at'] = str(datetime.utcnow())
        return self.update_booking_status(db, booking_id, BookingStatus.CANCELLED, details)
    
    def confirm_booking(self, db: Session, booking_id: UUID, confirmation_details: dict = None) -> Optional[BookingReference]:
        """Confirm a booking."""
        from datetime import datetime
        details = confirmation_details or {}
        details['confirmed_at'] = str(datetime.utcnow())
        return self.update_booking_status(db, booking_id, BookingStatus.CONFIRMED, details)
