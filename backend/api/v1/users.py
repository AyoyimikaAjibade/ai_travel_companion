"""
User management API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Any, Optional, Dict
from uuid import UUID

from dependencies import get_db, get_user_service
from services.user_service import UserService
from models.user import User, UserUpdate, UserPreference
from schemas.user import User as UserSchema
from core.security import get_current_active_user

router = APIRouter()


@router.get("/me", response_model=UserSchema)
def read_user_me(
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get current user."""
    return current_user


@router.put("/me", response_model=UserSchema)
def update_user_me(
    *,
    db: Session = Depends(get_db),
    user_service: UserService = Depends(get_user_service),
    user_in: UserUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Update current user."""
    updated_user = user_service.update_user_profile(db, current_user.id, user_in)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return updated_user


@router.get("/me/preferences", response_model=List[UserPreference])
def get_user_preferences(
    db: Session = Depends(get_db),
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get current user's preferences."""
    preferences = user_service.get_user_preferences(db, current_user.id)
    return preferences


@router.put("/me/preferences/{preference_type}")
def update_user_preference(
    preference_type: str,
    preference_value: Dict[str, Any],
    db: Session = Depends(get_db),
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Update a user preference."""
    preference = user_service.update_user_preference(
        db, current_user.id, preference_type, preference_value
    )
    return {"message": "Preference updated successfully", "preference": preference}


@router.get("/me/preference/{preference_type}")
def get_user_preference(
    preference_type: str,
    db: Session = Depends(get_db),
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get a specific user preference."""
    preference = user_service.get_user_preference(db, current_user.id, preference_type)
    if not preference:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preference not found"
        )
    return preference


@router.get("/me/stats")
def get_user_stats(
    db: Session = Depends(get_db),
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get current user's statistics."""
    stats = user_service.get_user_stats(db, current_user.id)
    return stats


@router.get("/{user_id}", response_model=UserSchema)
def read_user_by_id(
    user_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    user_service: UserService = Depends(get_user_service),
) -> Any:
    """Get a specific user by id (admin only)."""
    # In a real app, you might want to add admin check here
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    user = user_service.get_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


@router.get("/", response_model=List[UserSchema])
def read_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    active_only: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    user_service: UserService = Depends(get_user_service),
) -> Any:
    """Retrieve users (admin only)."""
    # In a real app, you might want to add admin check here
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    if active_only:
        users = user_service.get_active_users(db, skip=skip, limit=limit)
    else:
        users = user_service.get_all(db, skip=skip, limit=limit)
    
    return users


@router.delete("/{user_id}")
def delete_user(
    user_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    user_service: UserService = Depends(get_user_service),
) -> Any:
    """Delete a user (admin only)."""
    # In a real app, you might want to add admin check here
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    deleted_user = user_service.delete(db, user_id)
    if not deleted_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    return {"message": "User deleted successfully"}


@router.get("/search/")
def search_users(
    query: str = Query(..., min_length=3),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    user_service: UserService = Depends(get_user_service),
) -> Any:
    """Search users (admin only)."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    users = user_service.search_users(db, query, skip=skip, limit=limit)
    return users


@router.get("/stats/count")
def get_user_count(
    active_only: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    user_service: UserService = Depends(get_user_service),
) -> Any:
    """Get user count (admin only)."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    count = user_service.get_user_count(db, active_only=active_only)
    return {"total_users": count, "active_only": active_only}