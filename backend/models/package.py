from typing import List, Optional, Dict, Any
from sqlmodel import SQLModel, Field, Relationship, Column, JSON
import uuid

from .base import BaseModel

class PackageBase(SQLModel):
    """Base package model with common fields."""
    total_price: float = Field(ge=0, nullable=False)
    score: Optional[float] = Field(default=None, ge=0, le=10)
    explanation: Optional[str] = Field(default=None)
    flight_data: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    hotel_data: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    car_data: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    attractions_data: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    deeplinks: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))

class PackageCreate(PackageBase):
    """Model for creating a new package."""
    trip_id: uuid.UUID

class PackageUpdate(SQLModel):
    """Model for updating package information."""
    total_price: Optional[float] = Field(None, ge=0)
    score: Optional[float] = Field(None, ge=0, le=10)
    explanation: Optional[str] = None
    flight_data: Optional[Dict[str, Any]] = None
    hotel_data: Optional[Dict[str, Any]] = None
    car_data: Optional[Dict[str, Any]] = None
    attractions_data: Optional[Dict[str, Any]] = None
    deeplinks: Optional[Dict[str, Any]] = None

class Package(PackageBase, BaseModel, table=True):
    """Package model for database representation."""
    __tablename__ = "packages"
    
    trip_id: uuid.UUID = Field(foreign_key="trips.id", nullable=False)
    
    # Relationships
    trip: "Trip" = Relationship(back_populates="packages")
    components: List["TripComponent"] = Relationship(back_populates="package")
