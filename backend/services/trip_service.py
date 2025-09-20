"""
Trip service for trip management operations.
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from uuid import UUID, uuid4
from datetime import date

from .base_service import BaseService
from repositories.trip_repository import TripRepository
from models.trip import Trip, TripCreate, TripUpdate


class TripService(BaseService[Trip]):
    """Service for trip management operations."""
    
    def __init__(self):
        self.trip_repository = TripRepository()
        super().__init__(self.trip_repository)
    
    def get_user_trips(self, db: Session, user_id: UUID, skip: int = 0, limit: int = 100) -> List[Trip]:
        """Get all trips for a specific user."""
        return self.trip_repository.get_user_trips(db, user_id, skip=skip, limit=limit)
    
    def create_trip(self, db: Session, user_id: UUID, trip_create: TripCreate) -> Trip:
        """Create a new trip for a user."""
        trip_data = trip_create.dict()
        trip_data['user_id'] = user_id
        trip_data['share_code'] = self._generate_share_code()
        
        return self.trip_repository.create(db, trip_data)
    
    def get_trip_by_share_code(self, db: Session, share_code: str) -> Optional[Trip]:
        """Get trip by share code."""
        return self.trip_repository.get_trip_by_share_code(db, share_code)
    
    def update_trip(self, db: Session, trip_id: UUID, trip_update: TripUpdate) -> Optional[Trip]:
        """Update trip information."""
        trip = self.trip_repository.get_by_id(db, trip_id)
        if not trip:
            return None
        
        return self.trip_repository.update(db, trip, trip_update)
    
    def get_trips_by_destination(self, db: Session, destination_code: str, skip: int = 0, limit: int = 100) -> List[Trip]:
        """Get trips by destination."""
        return self.trip_repository.get_trips_by_destination(db, destination_code, skip=skip, limit=limit)
    
    def get_upcoming_trips(self, db: Session, user_id: UUID) -> List[Trip]:
        """Get upcoming trips for a user."""
        from datetime import date
        today = date.today()
        
        search_params = {
            'user_id': user_id,
            'status': 'active'
        }
        
        # This would need to be enhanced to filter by date
        return self.trip_repository.search_trips(db, search_params)
    
    def search_trips(self, db: Session, search_params: Dict[str, Any], skip: int = 0, limit: int = 100) -> List[Trip]:
        """Search trips with various filters."""
        return self.trip_repository.search_trips(db, search_params, skip=skip, limit=limit)
    
    def get_trip_stats(self, db: Session, trip_id: UUID) -> Dict[str, Any]:
        """Get trip statistics."""
        trip = self.trip_repository.get_by_id(db, trip_id)
        if not trip:
            return {}
        
        # This would be expanded based on your actual relationships
        stats = {
            "trip_id": trip_id,
            "destination": trip.destination_name,
            "origin": trip.origin_name,
            "duration_days": (trip.end_date - trip.start_date).days,
            "status": trip.status,
            "budget": trip.budget,
            "adults": trip.adults,
            "total_packages": 0,  # Would query package repository
            "total_components": 0,  # Would query component repository
            "created_at": trip.created_at
        }
        
        return stats
    
    def change_trip_status(self, db: Session, trip_id: UUID, new_status: str) -> Optional[Trip]:
        """Change trip status."""
        return self.trip_repository.update_trip_status(db, trip_id, new_status)
    
    def duplicate_trip(self, db: Session, trip_id: UUID, user_id: UUID) -> Optional[Trip]:
        """Duplicate an existing trip."""
        original_trip = self.trip_repository.get_by_id(db, trip_id)
        if not original_trip:
            return None
        
        # Create new trip data based on original
        trip_data = {
            'user_id': user_id,
            'origin_code': original_trip.origin_code,
            'origin_name': original_trip.origin_name,
            'destination_code': original_trip.destination_code,
            'destination_name': original_trip.destination_name,
            'start_date': original_trip.start_date,
            'end_date': original_trip.end_date,
            'adults': original_trip.adults,
            'budget': original_trip.budget,
            'status': 'draft',
            'notes': f"Copy of: {original_trip.notes or 'Trip'}",
            'share_code': self._generate_share_code()
        }
        
        return self.trip_repository.create(db, trip_data)
    
    def delete_trip(self, db: Session, trip_id: UUID, user_id: UUID) -> bool:
        """Delete a trip (only if owned by user)."""
        trip = self.trip_repository.get_by_id(db, trip_id)
        if not trip or trip.user_id != user_id:
            return False
        
        deleted_trip = self.trip_repository.delete(db, trip_id)
        return deleted_trip is not None
    
    def _generate_share_code(self) -> str:
        """Generate a unique share code for trip sharing."""
        import string
        import random
        
        # Generate a 8-character alphanumeric code
        characters = string.ascii_uppercase + string.digits
        return ''.join(random.choice(characters) for _ in range(8))
