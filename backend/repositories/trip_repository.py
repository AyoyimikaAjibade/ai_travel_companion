"""
Trip repository for trip-specific database operations.
"""

from typing import Optional, List
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import date

from .base_repository import BaseRepository
from models.trip import Trip


class TripRepository(BaseRepository[Trip]):
    """Repository for Trip model operations."""
    
    def __init__(self):
        super().__init__(Trip)
    
    def get_user_trips(self, db: Session, user_id: UUID, skip: int = 0, limit: int = 100) -> List[Trip]:
        """Get all trips for a specific user."""
        return db.query(Trip).filter(Trip.user_id == user_id).offset(skip).limit(limit).all()
    
    def get_trip_by_share_code(self, db: Session, share_code: str) -> Optional[Trip]:
        """Get trip by share code."""
        return db.query(Trip).filter(Trip.share_code == share_code).first()
    
    def get_trips_by_destination(self, db: Session, destination_code: str, skip: int = 0, limit: int = 100) -> List[Trip]:
        """Get trips by destination."""
        return db.query(Trip).filter(
            Trip.destination_code == destination_code
        ).offset(skip).limit(limit).all()
    
    def get_trips_by_date_range(self, db: Session, start_date: date, end_date: date, skip: int = 0, limit: int = 100) -> List[Trip]:
        """Get trips within a date range."""
        return db.query(Trip).filter(
            Trip.start_date >= start_date,
            Trip.end_date <= end_date
        ).offset(skip).limit(limit).all()
    
    def get_trips_by_status(self, db: Session, status: str, skip: int = 0, limit: int = 100) -> List[Trip]:
        """Get trips by status."""
        return db.query(Trip).filter(Trip.status == status).offset(skip).limit(limit).all()
    
    def get_user_active_trips(self, db: Session, user_id: UUID) -> List[Trip]:
        """Get active trips for a user."""
        return db.query(Trip).filter(
            Trip.user_id == user_id,
            Trip.status.in_(['draft', 'planned', 'active'])
        ).all()
    
    def search_trips(self, db: Session, search_params: dict, skip: int = 0, limit: int = 100) -> List[Trip]:
        """Search trips with various filters."""
        query = db.query(Trip)
        
        if 'user_id' in search_params:
            query = query.filter(Trip.user_id == search_params['user_id'])
        
        if 'destination' in search_params:
            query = query.filter(
                Trip.destination_name.ilike(f"%{search_params['destination']}%")
            )
        
        if 'origin' in search_params:
            query = query.filter(
                Trip.origin_name.ilike(f"%{search_params['origin']}%")
            )
        
        if 'status' in search_params:
            query = query.filter(Trip.status == search_params['status'])
        
        if 'budget_min' in search_params:
            query = query.filter(Trip.budget >= search_params['budget_min'])
        
        if 'budget_max' in search_params:
            query = query.filter(Trip.budget <= search_params['budget_max'])
        
        return query.offset(skip).limit(limit).all()
    
    def update_trip_status(self, db: Session, trip_id: UUID, status: str) -> Optional[Trip]:
        """Update trip status."""
        trip = self.get_by_id(db, trip_id)
        if trip:
            trip.status = status
            db.commit()
            db.refresh(trip)
        return trip
