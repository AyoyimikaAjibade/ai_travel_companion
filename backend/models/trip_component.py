from typing import List, Dict, Any, Optional
from sqlmodel import SQLModel, Field, Relationship, Column, JSON
import uuid
from enum import Enum

from .base import BaseModel

class ComponentType(str, Enum):
    """Enum for different types of trip components."""
    FLIGHT = "flight"
    HOTEL = "hotel"
    CAR_RENTAL = "car_rental"
    ACTIVITY = "activity"
    TRANSPORT = "transport"
    OTHER = "other"

class ComponentStatus(str, Enum):
    """Enum for component statuses."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class TripComponentBase(SQLModel):
    """Base trip component model with common fields."""
    type: ComponentType = Field(nullable=False)
    details: Dict[str, Any] = Field(default={}, sa_column=Column(JSON, nullable=False))
    status: ComponentStatus = Field(default=ComponentStatus.PENDING, nullable=False)

class TripComponentCreate(TripComponentBase):
    """Model for creating a new trip component."""
    trip_id: uuid.UUID
    package_id: Optional[uuid.UUID] = None

class TripComponentUpdate(SQLModel):
    """Model for updating trip component information."""
    type: Optional[ComponentType] = None
    details: Optional[Dict[str, Any]] = None
    status: Optional[ComponentStatus] = None
    package_id: Optional[uuid.UUID] = None

class TripComponent(TripComponentBase, BaseModel, table=True):
    """Trip component model for database representation."""
    __tablename__ = "trip_components"
    
    trip_id: uuid.UUID = Field(foreign_key="trips.id", nullable=False)
    package_id: Optional[uuid.UUID] = Field(foreign_key="packages.id", nullable=True)
    
    # Relationships
    trip: "Trip" = Relationship(back_populates="components")
    package: Optional["Package"] = Relationship(back_populates="components")
    booking_references: List["BookingReference"] = Relationship(back_populates="trip_component")
