"""
Package management API endpoints.
"""

from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID

from dependencies import get_db, get_package_service, get_trip_service
from services.package_service import PackageService
from services.trip_service import TripService
from models.package import Package, PackageCreate, PackageUpdate
from core.security import get_current_active_user
from models.user import User

router = APIRouter()


@router.get("/trip/{trip_id}", response_model=List[Package])
def get_trip_packages(
    trip_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    package_service: PackageService = Depends(get_package_service),
    trip_service: TripService = Depends(get_trip_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get all packages for a specific trip."""
    # Verify trip exists and user owns it
    trip = trip_service.get_by_id(db, trip_id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    if trip.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    packages = package_service.get_trip_packages(db, trip_id, skip=skip, limit=limit)
    return packages


@router.post("/", response_model=Package)
def create_package(
    package_in: PackageCreate,
    db: Session = Depends(get_db),
    package_service: PackageService = Depends(get_package_service),
    trip_service: TripService = Depends(get_trip_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Create a new package."""
    # Verify trip exists and user owns it
    trip = trip_service.get_by_id(db, package_in.trip_id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    if trip.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    package = package_service.create_package(db, package_in)
    return package


@router.get("/{package_id}", response_model=Package)
def get_package(
    package_id: UUID,
    db: Session = Depends(get_db),
    package_service: PackageService = Depends(get_package_service),
    trip_service: TripService = Depends(get_trip_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get a specific package."""
    package = package_service.get_by_id(db, package_id)
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found"
        )
    
    # Verify user owns the trip this package belongs to
    trip = trip_service.get_by_id(db, package.trip_id)
    if not trip or trip.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return package


@router.put("/{package_id}", response_model=Package)
def update_package(
    package_id: UUID,
    package_update: PackageUpdate,
    db: Session = Depends(get_db),
    package_service: PackageService = Depends(get_package_service),
    trip_service: TripService = Depends(get_trip_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Update a package."""
    package = package_service.get_by_id(db, package_id)
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found"
        )
    
    # Verify user owns the trip this package belongs to
    trip = trip_service.get_by_id(db, package.trip_id)
    if not trip or trip.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    updated_package = package_service.update_package(db, package_id, package_update)
    return updated_package


@router.delete("/{package_id}")
def delete_package(
    package_id: UUID,
    db: Session = Depends(get_db),
    package_service: PackageService = Depends(get_package_service),
    trip_service: TripService = Depends(get_trip_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Delete a package."""
    package = package_service.get_by_id(db, package_id)
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found"
        )
    
    # Verify user owns the trip this package belongs to
    trip = trip_service.get_by_id(db, package.trip_id)
    if not trip or trip.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    deleted_package = package_service.delete(db, package_id)
    if not deleted_package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found"
        )
    
    return {"message": "Package deleted successfully"}


@router.get("/trip/{trip_id}/best", response_model=List[Package])
def get_best_packages(
    trip_id: UUID,
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    package_service: PackageService = Depends(get_package_service),
    trip_service: TripService = Depends(get_trip_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get best packages for a trip ordered by score."""
    # Verify trip exists and user owns it
    trip = trip_service.get_by_id(db, trip_id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    if trip.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    packages = package_service.get_best_packages(db, trip_id, limit=limit)
    return packages


@router.get("/trip/{trip_id}/cheapest", response_model=List[Package])
def get_cheapest_packages(
    trip_id: UUID,
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    package_service: PackageService = Depends(get_package_service),
    trip_service: TripService = Depends(get_trip_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get cheapest packages for a trip."""
    # Verify trip exists and user owns it
    trip = trip_service.get_by_id(db, trip_id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    if trip.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    packages = package_service.get_cheapest_packages(db, trip_id, limit=limit)
    return packages


@router.get("/trip/{trip_id}/recommendations", response_model=List[Package])
def get_package_recommendations(
    trip_id: UUID,
    db: Session = Depends(get_db),
    package_service: PackageService = Depends(get_package_service),
    trip_service: TripService = Depends(get_trip_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get package recommendations for a trip based on user preferences."""
    # Verify trip exists and user owns it
    trip = trip_service.get_by_id(db, trip_id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    if trip.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Get user preferences (this would be expanded with actual preference logic)
    user_preferences = {
        'max_budget': trip.budget,
        'min_score': 6.0
    }
    
    packages = package_service.get_package_recommendations(db, trip_id, user_preferences)
    return packages


@router.post("/compare")
def compare_packages(
    package_ids: List[UUID],
    db: Session = Depends(get_db),
    package_service: PackageService = Depends(get_package_service),
    trip_service: TripService = Depends(get_trip_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Compare multiple packages."""
    if len(package_ids) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least 2 packages are required for comparison"
        )
    
    if len(package_ids) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 5 packages can be compared at once"
        )
    
    # Verify user owns all packages (through trips)
    for package_id in package_ids:
        package = package_service.get_by_id(db, package_id)
        if not package:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Package {package_id} not found"
            )
        
        trip = trip_service.get_by_id(db, package.trip_id)
        if not trip or trip.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
    
    comparison = package_service.compare_packages(db, package_ids)
    return comparison


@router.put("/{package_id}/score")
def update_package_score(
    package_id: UUID,
    db: Session = Depends(get_db),
    package_service: PackageService = Depends(get_package_service),
    trip_service: TripService = Depends(get_trip_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Recalculate and update package score."""
    package = package_service.get_by_id(db, package_id)
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found"
        )
    
    # Verify user owns the trip this package belongs to
    trip = trip_service.get_by_id(db, package.trip_id)
    if not trip or trip.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    updated_package = package_service.update_package_score(db, package_id)
    return {"message": "Package score updated successfully", "package": updated_package}


@router.get("/search/")
def search_packages(
    trip_id: Optional[UUID] = Query(None),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    min_score: Optional[float] = Query(None, ge=0, le=10),
    max_score: Optional[float] = Query(None, ge=0, le=10),
    has_flight: Optional[bool] = Query(None),
    has_hotel: Optional[bool] = Query(None),
    has_car: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    package_service: PackageService = Depends(get_package_service),
    trip_service: TripService = Depends(get_trip_service),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Search packages with filters."""
    search_params = {}
    
    if trip_id:
        # Verify user owns the trip
        trip = trip_service.get_by_id(db, trip_id)
        if not trip or trip.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        search_params['trip_id'] = trip_id
    
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
    
    packages = package_service.search_packages(db, search_params, skip=skip, limit=limit)
    return packages
