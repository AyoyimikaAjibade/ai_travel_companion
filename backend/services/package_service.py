"""
Package service for travel package management operations.
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from uuid import UUID

from .base_service import BaseService
from repositories.package_repository import PackageRepository
from models.package import Package, PackageCreate, PackageUpdate


class PackageService(BaseService[Package]):
    """Service for package management operations."""
    
    def __init__(self):
        self.package_repository = PackageRepository()
        super().__init__(self.package_repository)
    
    def get_trip_packages(self, db: Session, trip_id: UUID, skip: int = 0, limit: int = 100) -> List[Package]:
        """Get all packages for a specific trip."""
        return self.package_repository.get_trip_packages(db, trip_id, skip=skip, limit=limit)
    
    def create_package(self, db: Session, package_create: PackageCreate) -> Package:
        """Create a new package."""
        return self.package_repository.create(db, package_create)
    
    def get_best_packages(self, db: Session, trip_id: UUID, limit: int = 5) -> List[Package]:
        """Get best packages for a trip ordered by score."""
        return self.package_repository.get_best_packages_for_trip(db, trip_id, limit=limit)
    
    def get_cheapest_packages(self, db: Session, trip_id: UUID, limit: int = 5) -> List[Package]:
        """Get cheapest packages for a trip."""
        return self.package_repository.get_cheapest_packages_for_trip(db, trip_id, limit=limit)
    
    def search_packages(self, db: Session, search_params: Dict[str, Any], skip: int = 0, limit: int = 100) -> List[Package]:
        """Search packages with various filters."""
        return self.package_repository.search_packages(db, search_params, skip=skip, limit=limit)
    
    def update_package(self, db: Session, package_id: UUID, package_update: PackageUpdate) -> Optional[Package]:
        """Update package information."""
        package = self.package_repository.get_by_id(db, package_id)
        if not package:
            return None
        
        return self.package_repository.update(db, package, package_update)
    
    def calculate_package_score(self, package_data: Dict[str, Any]) -> float:
        """Calculate package score based on various factors."""
        # This is a dummy implementation - you would implement your actual scoring logic
        base_score = 5.0
        
        # Factor in price (lower price = higher score)
        price = package_data.get('total_price', 1000)
        price_score = max(0, 10 - (price / 100))  # Simplified scoring
        
        # Factor in completeness (having all components)
        completeness_score = 0
        if package_data.get('flight_data'):
            completeness_score += 2
        if package_data.get('hotel_data'):
            completeness_score += 2
        if package_data.get('car_data'):
            completeness_score += 1
        if package_data.get('attractions_data'):
            completeness_score += 1
        
        # Combine scores (you would implement more sophisticated logic)
        final_score = min(10, (base_score + price_score + completeness_score) / 3)
        return round(final_score, 2)
    
    def update_package_score(self, db: Session, package_id: UUID) -> Optional[Package]:
        """Recalculate and update package score."""
        package = self.package_repository.get_by_id(db, package_id)
        if not package:
            return None
        
        # Get package data for scoring
        package_data = {
            'total_price': package.total_price,
            'flight_data': package.flight_data,
            'hotel_data': package.hotel_data,
            'car_data': package.car_data,
            'attractions_data': package.attractions_data
        }
        
        new_score = self.calculate_package_score(package_data)
        return self.package_repository.update_package_score(db, package_id, new_score)
    
    def get_package_recommendations(self, db: Session, trip_id: UUID, user_preferences: Dict[str, Any] = None) -> List[Package]:
        """Get package recommendations based on user preferences."""
        # This is a dummy implementation - you would implement ML-based recommendations
        search_params = {'trip_id': trip_id}
        
        if user_preferences:
            if 'max_budget' in user_preferences:
                search_params['max_price'] = user_preferences['max_budget']
            
            if 'min_score' in user_preferences:
                search_params['min_score'] = user_preferences['min_score']
            
            # Add more preference-based filtering
        
        return self.package_repository.search_packages(db, search_params, limit=10)
    
    def compare_packages(self, db: Session, package_ids: List[UUID]) -> Dict[str, Any]:
        """Compare multiple packages."""
        packages = []
        for package_id in package_ids:
            package = self.package_repository.get_by_id(db, package_id)
            if package:
                packages.append(package)
        
        if not packages:
            return {}
        
        comparison = {
            'packages': packages,
            'price_range': {
                'min': min(p.total_price for p in packages),
                'max': max(p.total_price for p in packages)
            },
            'score_range': {
                'min': min(p.score for p in packages if p.score),
                'max': max(p.score for p in packages if p.score)
            },
            'features': {
                'has_flight': [p.id for p in packages if p.flight_data],
                'has_hotel': [p.id for p in packages if p.hotel_data],
                'has_car': [p.id for p in packages if p.car_data],
                'has_attractions': [p.id for p in packages if p.attractions_data]
            }
        }
        
        return comparison
    
    def bulk_update_packages(self, db: Session, trip_id: UUID, updates: Dict[str, Any]) -> List[Package]:
        """Bulk update all packages for a trip."""
        packages = self.get_trip_packages(db, trip_id)
        updated_packages = []
        
        for package in packages:
            updated_package = self.package_repository.update(db, package, updates)
            updated_packages.append(updated_package)
        
        return updated_packages
