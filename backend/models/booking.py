from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field, Relationship, Column, JSON
import uuid
from enum import Enum

from .base import BaseModel

class BookingStatus(str, Enum):
    """Enum for booking statuses."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    FAILED = "failed"

class BookingReferenceBase(SQLModel):
    """Base booking reference model with common fields."""
    provider: str = Field(max_length=100, nullable=False)
    reference_code: str = Field(nullable=False)
    status: BookingStatus = Field(default=BookingStatus.PENDING, nullable=False)
    details: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))

class BookingReferenceCreate(BookingReferenceBase):
    """Model for creating a new booking reference."""
    user_id: uuid.UUID
    trip_component_id: uuid.UUID

class BookingReferenceUpdate(SQLModel):
    """Model for updating booking reference information."""
    provider: Optional[str] = None
    reference_code: Optional[str] = None
    status: Optional[BookingStatus] = None
    details: Optional[Dict[str, Any]] = None

class BookingReference(BookingReferenceBase, BaseModel, table=True):
    """Booking reference model for database representation."""
    __tablename__ = "booking_references"
    
    user_id: uuid.UUID = Field(foreign_key="users.id", nullable=False)
    trip_component_id: uuid.UUID = Field(foreign_key="trip_components.id", nullable=False)
    
    # Relationships
    user: "User" = Relationship(back_populates="booking_references")
    trip_component: "TripComponent" = Relationship(back_populates="booking_references")
