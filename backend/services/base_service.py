"""
Base service class providing common functionality for all services.
"""

from abc import ABC
from typing import TypeVar, Generic, Type, Optional, List, Any
from sqlalchemy.orm import Session
from uuid import UUID

from repositories.base_repository import BaseRepository

T = TypeVar('T')


class BaseService(ABC, Generic[T]):
    """
    Base service class that provides common CRUD operations.
    All service classes should inherit from this base class.
    """
    
    def __init__(self, repository: BaseRepository[T]):
        self.repository = repository
    
    def get_by_id(self, db: Session, id: UUID) -> Optional[T]:
        """Get a single record by ID."""
        return self.repository.get_by_id(db, id)
    
    def get_all(self, db: Session, skip: int = 0, limit: int = 100) -> List[T]:
        """Get all records with pagination."""
        return self.repository.get_all(db, skip=skip, limit=limit)
    
    def create(self, db: Session, obj_in: Any) -> T:
        """Create a new record."""
        return self.repository.create(db, obj_in)
    
    def update(self, db: Session, db_obj: T, obj_in: Any) -> T:
        """Update an existing record."""
        return self.repository.update(db, db_obj, obj_in)
    
    def delete(self, db: Session, id: UUID) -> Optional[T]:
        """Delete a record by ID."""
        return self.repository.delete(db, id)
    
    def exists(self, db: Session, id: UUID) -> bool:
        """Check if a record exists by ID."""
        return self.repository.exists(db, id)
