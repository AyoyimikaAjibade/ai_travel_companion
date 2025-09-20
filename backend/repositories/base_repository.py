"""
Base repository class providing common database operations.
"""

from abc import ABC
from typing import TypeVar, Generic, Type, Optional, List, Any, Dict
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from uuid import UUID

from models.base import BaseModel

T = TypeVar('T', bound=BaseModel)


class BaseRepository(ABC, Generic[T]):
    """
    Base repository class that provides common CRUD operations.
    All repository classes should inherit from this base class.
    """
    
    def __init__(self, model: Type[T]):
        self.model = model
    
    def get_by_id(self, db: Session, id: UUID) -> Optional[T]:
        """Get a single record by ID."""
        return db.query(self.model).filter(self.model.id == id).first()
    
    def get_all(self, db: Session, skip: int = 0, limit: int = 100) -> List[T]:
        """Get all records with pagination."""
        return db.query(self.model).offset(skip).limit(limit).all()
    
    def get_by_field(self, db: Session, field_name: str, value: Any) -> Optional[T]:
        """Get a single record by a specific field."""
        return db.query(self.model).filter(getattr(self.model, field_name) == value).first()
    
    def get_multi_by_field(self, db: Session, field_name: str, value: Any, skip: int = 0, limit: int = 100) -> List[T]:
        """Get multiple records by a specific field."""
        return db.query(self.model).filter(
            getattr(self.model, field_name) == value
        ).offset(skip).limit(limit).all()
    
    def create(self, db: Session, obj_in: Any) -> T:
        """Create a new record."""
        if hasattr(obj_in, 'dict'):
            obj_data = obj_in.dict()
        else:
            obj_data = obj_in
        
        db_obj = self.model(**obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update(self, db: Session, db_obj: T, obj_in: Any) -> T:
        """Update an existing record."""
        if hasattr(obj_in, 'dict'):
            update_data = obj_in.dict(exclude_unset=True)
        else:
            update_data = obj_in
        
        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def delete(self, db: Session, id: UUID) -> Optional[T]:
        """Delete a record by ID."""
        db_obj = self.get_by_id(db, id)
        if db_obj:
            db.delete(db_obj)
            db.commit()
        return db_obj
    
    def exists(self, db: Session, id: UUID) -> bool:
        """Check if a record exists by ID."""
        return db.query(self.model).filter(self.model.id == id).first() is not None
    
    def count(self, db: Session, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count records with optional filters."""
        query = db.query(self.model)
        
        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field):
                    query = query.filter(getattr(self.model, field) == value)
        
        return query.count()
    
    def search(self, db: Session, filters: Dict[str, Any], skip: int = 0, limit: int = 100) -> List[T]:
        """Search records with multiple filters."""
        query = db.query(self.model)
        
        for field, value in filters.items():
            if hasattr(self.model, field):
                if isinstance(value, list):
                    query = query.filter(getattr(self.model, field).in_(value))
                elif isinstance(value, dict) and 'operator' in value:
                    # Support for complex queries like {'operator': 'gte', 'value': 100}
                    field_attr = getattr(self.model, field)
                    if value['operator'] == 'gte':
                        query = query.filter(field_attr >= value['value'])
                    elif value['operator'] == 'lte':
                        query = query.filter(field_attr <= value['value'])
                    elif value['operator'] == 'like':
                        query = query.filter(field_attr.like(f"%{value['value']}%"))
                else:
                    query = query.filter(getattr(self.model, field) == value)
        
        return query.offset(skip).limit(limit).all()
