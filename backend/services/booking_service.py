"""
Booking service for booking management operations.
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime

from .base_service import BaseService
from repositories.booking_repository import BookingRepository
from models.booking import BookingReference, BookingReferenceCreate, BookingReferenceUpdate, BookingStatus


class BookingService(BaseService[BookingReference]):
    """Service for booking management operations."""
    
    def __init__(self):
        self.booking_repository = BookingRepository()
        super().__init__(self.booking_repository)
    
    def get_user_bookings(self, db: Session, user_id: UUID, skip: int = 0, limit: int = 100) -> List[BookingReference]:
        """Get all bookings for a specific user."""
        return self.booking_repository.get_user_bookings(db, user_id, skip=skip, limit=limit)
    
    def create_booking(self, db: Session, booking_create: BookingReferenceCreate) -> BookingReference:
        """Create a new booking reference."""
        booking_data = booking_create.dict()
        booking_data['details'] = booking_data.get('details', {})
        booking_data['details']['created_at'] = str(datetime.utcnow())
        
        return self.booking_repository.create(db, booking_data)
    
    def get_booking_by_reference(self, db: Session, reference_code: str, provider: str) -> Optional[BookingReference]:
        """Get booking by reference code and provider."""
        return self.booking_repository.get_booking_by_reference(db, reference_code, provider)
    
    def update_booking(self, db: Session, booking_id: UUID, booking_update: BookingReferenceUpdate) -> Optional[BookingReference]:
        """Update booking information."""
        booking = self.booking_repository.get_by_id(db, booking_id)
        if not booking:
            return None
        
        return self.booking_repository.update(db, booking, booking_update)
    
    def confirm_booking(self, db: Session, booking_id: UUID, confirmation_details: Dict[str, Any] = None) -> Optional[BookingReference]:
        """Confirm a booking."""
        details = confirmation_details or {}
        details['confirmed_at'] = str(datetime.utcnow())
        
        return self.booking_repository.confirm_booking(db, booking_id, details)
    
    def cancel_booking(self, db: Session, booking_id: UUID, cancellation_reason: str = None) -> Optional[BookingReference]:
        """Cancel a booking."""
        details = {
            'cancelled_at': str(datetime.utcnow()),
            'cancellation_reason': cancellation_reason or 'User requested'
        }
        
        return self.booking_repository.cancel_booking(db, booking_id, details)
    
    def get_bookings_by_status(self, db: Session, status: BookingStatus, skip: int = 0, limit: int = 100) -> List[BookingReference]:
        """Get bookings by status."""
        return self.booking_repository.get_bookings_by_status(db, status, skip=skip, limit=limit)
    
    def get_user_active_bookings(self, db: Session, user_id: UUID) -> List[BookingReference]:
        """Get active bookings for a user."""
        return self.booking_repository.get_user_bookings_by_status(db, user_id, BookingStatus.CONFIRMED)
    
    def search_bookings(self, db: Session, search_params: Dict[str, Any], skip: int = 0, limit: int = 100) -> List[BookingReference]:
        """Search bookings with various filters."""
        return self.booking_repository.search_bookings(db, search_params, skip=skip, limit=limit)
    
    def get_booking_stats(self, db: Session, user_id: UUID = None) -> Dict[str, Any]:
        """Get booking statistics."""
        stats = {
            'total_bookings': 0,
            'confirmed_bookings': 0,
            'pending_bookings': 0,
            'cancelled_bookings': 0,
            'failed_bookings': 0,
            'by_provider': {},
            'by_status': {}
        }
        
        search_params = {}
        if user_id:
            search_params['user_id'] = user_id
        
        all_bookings = self.booking_repository.search_bookings(db, search_params, limit=1000)
        
        stats['total_bookings'] = len(all_bookings)
        
        for booking in all_bookings:
            # Count by status
            status_key = f"{booking.status.value}_bookings"
            if status_key in stats:
                stats[status_key] += 1
            
            # Count by provider
            if booking.provider not in stats['by_provider']:
                stats['by_provider'][booking.provider] = 0
            stats['by_provider'][booking.provider] += 1
            
            # Count by status for detailed breakdown
            status_value = booking.status.value
            if status_value not in stats['by_status']:
                stats['by_status'][status_value] = 0
            stats['by_status'][status_value] += 1
        
        return stats
    
    def process_booking_webhook(self, db: Session, provider: str, webhook_data: Dict[str, Any]) -> Optional[BookingReference]:
        """Process booking webhook from external provider."""
        # This is a dummy implementation - you would implement actual webhook processing
        reference_code = webhook_data.get('reference_code')
        if not reference_code:
            return None
        
        booking = self.booking_repository.get_booking_by_reference(db, reference_code, provider)
        if not booking:
            return None
        
        # Update booking based on webhook data
        new_status = webhook_data.get('status')
        if new_status:
            status_mapping = {
                'confirmed': BookingStatus.CONFIRMED,
                'cancelled': BookingStatus.CANCELLED,
                'failed': BookingStatus.FAILED
            }
            
            mapped_status = status_mapping.get(new_status.lower())
            if mapped_status:
                details = booking.details.copy()
                details.update(webhook_data)
                details['webhook_processed_at'] = str(datetime.utcnow())
                
                return self.booking_repository.update_booking_status(db, booking.id, mapped_status, details)
        
        return booking
    
    def retry_failed_booking(self, db: Session, booking_id: UUID) -> Optional[BookingReference]:
        """Retry a failed booking."""
        booking = self.booking_repository.get_by_id(db, booking_id)
        if not booking or booking.status != BookingStatus.FAILED:
            return None
        
        # Reset to pending for retry
        details = booking.details.copy()
        details['retry_attempted_at'] = str(datetime.utcnow())
        details['retry_count'] = details.get('retry_count', 0) + 1
        
        return self.booking_repository.update_booking_status(db, booking_id, BookingStatus.PENDING, details)
