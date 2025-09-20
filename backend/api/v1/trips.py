"""
Trip management API endpoints.
"""

from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID

from dependencies import get_db, get_trip_service
from services.trip_service import TripService
from models.trip import Trip, TripCreate, TripUpdate, TripPublic
from core.security import get_current_active_user
from models.user import User

router = APIRouter()


@router.get("/", response_model=List[TripPublic])
def get_user_trips(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    trip_service: TripService = Depends(get_trip_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get all trips for the current user."""
    trips = trip_service.get_user_trips(db, current_user.id, skip=skip, limit=limit)
    return trips


@router.post("/", response_model=TripPublic)
def create_trip(
    trip_in: TripCreate,
    db: Session = Depends(get_db),
    trip_service: TripService = Depends(get_trip_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Create a new trip."""
    trip = trip_service.create_trip(db, current_user.id, trip_in)
    return trip


@router.get("/{trip_id}", response_model=TripPublic)
def get_trip(
    trip_id: UUID,
    db: Session = Depends(get_db),
    trip_service: TripService = Depends(get_trip_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get a specific trip."""
    trip = trip_service.get_by_id(db, trip_id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    # Check if user owns the trip
    if trip.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return trip


@router.put("/{trip_id}", response_model=TripPublic)
def update_trip(
    trip_id: UUID,
    trip_update: TripUpdate,
    db: Session = Depends(get_db),
    trip_service: TripService = Depends(get_trip_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Update a trip."""
    trip = trip_service.get_by_id(db, trip_id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    # Check if user owns the trip
    if trip.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    updated_trip = trip_service.update_trip(db, trip_id, trip_update)
    return updated_trip


@router.delete("/{trip_id}")
def delete_trip(
    trip_id: UUID,
    db: Session = Depends(get_db),
    trip_service: TripService = Depends(get_trip_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Delete a trip."""
    success = trip_service.delete_trip(db, trip_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found or not owned by user"
        )
    
    return {"message": "Trip deleted successfully"}


@router.get("/shared/{share_code}", response_model=TripPublic)
def get_shared_trip(
    share_code: str,
    db: Session = Depends(get_db),
    trip_service: TripService = Depends(get_trip_service)
) -> Any:
    """Get a trip by share code (public access)."""
    trip = trip_service.get_trip_by_share_code(db, share_code)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared trip not found"
        )
    
    return trip


@router.post("/{trip_id}/duplicate", response_model=TripPublic)
def duplicate_trip(
    trip_id: UUID,
    db: Session = Depends(get_db),
    trip_service: TripService = Depends(get_trip_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Duplicate an existing trip."""
    duplicated_trip = trip_service.duplicate_trip(db, trip_id, current_user.id)
    if not duplicated_trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    return duplicated_trip


@router.put("/{trip_id}/status")
def change_trip_status(
    trip_id: UUID,
    new_status: str,
    db: Session = Depends(get_db),
    trip_service: TripService = Depends(get_trip_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Change trip status."""
    trip = trip_service.get_by_id(db, trip_id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    # Check if user owns the trip
    if trip.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Validate status
    valid_statuses = ['draft', 'planned', 'active', 'completed', 'cancelled']
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    updated_trip = trip_service.change_trip_status(db, trip_id, new_status)
    return {"message": "Trip status updated successfully", "trip": updated_trip}


@router.get("/{trip_id}/stats")
def get_trip_stats(
    trip_id: UUID,
    db: Session = Depends(get_db),
    trip_service: TripService = Depends(get_trip_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get trip statistics."""
    trip = trip_service.get_by_id(db, trip_id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    # Check if user owns the trip
    if trip.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    stats = trip_service.get_trip_stats(db, trip_id)
    return stats


@router.get("/search/")
def search_trips(
    destination: Optional[str] = Query(None),
    origin: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    budget_min: Optional[float] = Query(None, ge=0),
    budget_max: Optional[float] = Query(None, ge=0),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    trip_service: TripService = Depends(get_trip_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Search user's trips with filters."""
    search_params = {'user_id': current_user.id}
    
    if destination:
        search_params['destination'] = destination
    if origin:
        search_params['origin'] = origin
    if status:
        search_params['status'] = status
    if budget_min:
        search_params['budget_min'] = budget_min
    if budget_max:
        search_params['budget_max'] = budget_max
    
    trips = trip_service.search_trips(db, search_params, skip=skip, limit=limit)
    return trips
