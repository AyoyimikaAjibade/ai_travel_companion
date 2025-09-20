"""
Package repository for package-specific database operations.
"""

from typing import Optional, List
from sqlalchemy.orm import Session
from uuid import UUID

from .base_repository import BaseRepository
from models.package import Package


class PackageRepository(BaseRepository[Package]):
    """Repository for Package model operations."""
    
    def __init__(self):
        super().__init__(Package)
    
    def get_trip_packages(self, db: Session, trip_id: UUID, skip: int = 0, limit: int = 100) -> List[Package]:
        """Get all packages for a specific trip."""
        return db.query(Package).filter(Package.trip_id == trip_id).offset(skip).limit(limit).all()
    
    def get_packages_by_score_range(self, db: Session, min_score: float, max_score: float, skip: int = 0, limit: int = 100) -> List[Package]:
        """Get packages within a score range."""
        return db.query(Package).filter(
            Package.score >= min_score,
            Package.score <= max_score
        ).offset(skip).limit(limit).all()
    
    def get_packages_by_price_range(self, db: Session, min_price: float, max_price: float, skip: int = 0, limit: int = 100) -> List[Package]:
        """Get packages within a price range."""
        return db.query(Package).filter(
            Package.total_price >= min_price,
            Package.total_price <= max_price
        ).offset(skip).limit(limit).all()
    
    def get_best_packages_for_trip(self, db: Session, trip_id: UUID, limit: int = 5) -> List[Package]:
        """Get best packages for a trip ordered by score."""
        return db.query(Package).filter(Package.trip_id == trip_id).order_by(
            Package.score.desc()
        ).limit(limit).all()
    
    def get_cheapest_packages_for_trip(self, db: Session, trip_id: UUID, limit: int = 5) -> List[Package]:
        """Get cheapest packages for a trip ordered by price."""
        return db.query(Package).filter(Package.trip_id == trip_id).order_by(
            Package.total_price.asc()
        ).limit(limit).all()
    
    def search_packages(self, db: Session, search_params: dict, skip: int = 0, limit: int = 100) -> List[Package]:
        """Search packages with various filters."""
        query = db.query(Package)
        
        if 'trip_id' in search_params:
            query = query.filter(Package.trip_id == search_params['trip_id'])
        
        if 'min_price' in search_params:
            query = query.filter(Package.total_price >= search_params['min_price'])
        
        if 'max_price' in search_params:
            query = query.filter(Package.total_price <= search_params['max_price'])
        
        if 'min_score' in search_params:
            query = query.filter(Package.score >= search_params['min_score'])
        
        if 'max_score' in search_params:
            query = query.filter(Package.score <= search_params['max_score'])
        
        if 'has_flight' in search_params and search_params['has_flight']:
            query = query.filter(Package.flight_data.isnot(None))
        
        if 'has_hotel' in search_params and search_params['has_hotel']:
            query = query.filter(Package.hotel_data.isnot(None))
        
        if 'has_car' in search_params and search_params['has_car']:
            query = query.filter(Package.car_data.isnot(None))
        
        # Order by score by default
        query = query.order_by(Package.score.desc())
        
        return query.offset(skip).limit(limit).all()
    
    def update_package_score(self, db: Session, package_id: UUID, score: float) -> Optional[Package]:
        """Update package score."""
        package = self.get_by_id(db, package_id)
        if package:
            package.score = score
            db.commit()
            db.refresh(package)
        return package
