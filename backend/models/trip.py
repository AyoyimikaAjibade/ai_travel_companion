from datetime import date, datetime
from typing import List, Optional, Dict, Any
from sqlmodel import SQLModel, Field, Relationship
import uuid

from .base import BaseModel

class TripBase(SQLModel):
    """Base trip model with common fields."""
    origin_code: str = Field(max_length=3, nullable=False)
    origin_name: str = Field(nullable=False)
    destination_code: str = Field(max_length=3, nullable=False)
    destination_name: str = Field(nullable=False)
    start_date: date = Field(nullable=False)
    end_date: date = Field(nullable=False)
    adults: int = Field(default=1, ge=1)
    budget: Optional[float] = Field(default=None, ge=0)
    status: str = Field(default="draft", max_length=20)
    notes: Optional[str] = Field(default=None)

class TripCreate(TripBase):
    """Model for creating a new trip."""
    pass

class TripUpdate(SQLModel):
    """Model for updating trip information."""
    origin_code: Optional[str] = None
    origin_name: Optional[str] = None
    destination_code: Optional[str] = None
    destination_name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    adults: Optional[int] = Field(None, ge=1)
    budget: Optional[float] = Field(None, ge=0)
    status: Optional[str] = None
    notes: Optional[str] = None

class TripPublic(TripBase):
    """Public trip model for API responses."""
    id: uuid.UUID
    user_id: uuid.UUID
    share_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class Trip(TripBase, BaseModel, table=True):
    """Trip model for database representation."""
    __tablename__ = "trips"
    
    user_id: uuid.UUID = Field(foreign_key="users.id", nullable=False)
    share_code: Optional[str] = Field(default=None, unique=True, index=True)
    
    # Relationships
    user: "User" = Relationship(back_populates="trips")
    packages: List["Package"] = Relationship(back_populates="trip")
    components: List["TripComponent"] = Relationship(back_populates="trip")
