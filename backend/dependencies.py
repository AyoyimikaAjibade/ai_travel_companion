"""
Dependency injection for services and repositories.
This module provides dependency injection for the application layers.
"""

from typing import Generator
from sqlalchemy.orm import Session
from fastapi import Depends

from core.database import SessionLocal
from services.auth_service import AuthService
from services.user_service import UserService
from services.trip_service import TripService
from services.package_service import PackageService
from services.booking_service import BookingService


# Database dependency
def get_db() -> Generator[Session, None, None]:
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Service dependencies
def get_auth_service() -> AuthService:
    """Get authentication service instance."""
    return AuthService()


def get_user_service() -> UserService:
    """Get user service instance."""
    return UserService()


def get_trip_service() -> TripService:
    """Get trip service instance."""
    return TripService()


def get_package_service() -> PackageService:
    """Get package service instance."""
    return PackageService()


def get_booking_service() -> BookingService:
    """Get booking service instance."""
    return BookingService()


# Repository dependencies (if needed directly)
def get_user_repository():
    """Get user repository instance."""
    from repositories.user_repository import UserRepository
    return UserRepository()


def get_trip_repository():
    """Get trip repository instance."""
    from repositories.trip_repository import TripRepository
    return TripRepository()


def get_package_repository():
    """Get package repository instance."""
    from repositories.package_repository import PackageRepository
    return PackageRepository()


def get_booking_repository():
    """Get booking repository instance."""
    from repositories.booking_repository import BookingRepository
    return BookingRepository()
