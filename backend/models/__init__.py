"""
Database models for the AI Travel Companion application.
"""

from .base import BaseModel
from .user import User, UserPreference
from .trip import Trip, TripCreate, TripPublic
from .package import Package, PackageBase
from .trip_component import TripComponent, TripComponentBase
from .booking import BookingReference, BookingReferenceBase

__all__ = [
    'BaseModel',
    'User', 'UserPreference',
    'Trip', 'TripCreate', 'TripPublic',
    'Package', 'PackageBase',
    'TripComponent', 'TripComponentBase',
    'BookingReference', 'BookingReferenceBase'
]
