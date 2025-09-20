"""
API v1 package for AI Travel Companion
"""

from fastapi import APIRouter
from core.config import settings

# Import all API route modules
from . import auth, users, trips, packages, components, bookings

# Create main API router
api_router = APIRouter()

# Include all API routes
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["authentication"]
)

api_router.include_router(
    users.router,
    prefix="/users",
    tags=["users"]
)

api_router.include_router(
    trips.router,
    prefix="/trips",
    tags=["trips"]
)

api_router.include_router(
    packages.router,
    prefix="/packages",
    tags=["packages"]
)

api_router.include_router(
    components.router,
    prefix="/components",
    tags=["trip_components"]
)

api_router.include_router(
    bookings.router,
    prefix="/bookings",
    tags=["bookings"]
)

# Health check endpoint
@api_router.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint to verify the API is running."""
    return {"status": "ok", "version": settings.API_VERSION}

__all__ = ["api_router"]
