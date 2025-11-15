"""
API v1 package for AI Travel Companion
"""

from fastapi import APIRouter
from core.config import settings

# Import all API route modules
from . import auth, users, chats, chat_messages, plans, ai_integration

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
    chats.router,
    prefix="/chats",
    tags=["chats"]
)

api_router.include_router(
    chat_messages.router,
    prefix="/chats",
    tags=["chat_messages"]
)

api_router.include_router(
    plans.router,
    prefix="/plans",
    tags=["plans"]
)

api_router.include_router(
    ai_integration.router,
    prefix="/ai",
    tags=["ai_integration"]
)

# Health check endpoint
@api_router.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint to verify the API is running."""
    return {"status": "ok", "version": settings.API_VERSION}

__all__ = ["api_router"]
