from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Any
from jose import JWTError, jwt
from pydantic import ValidationError

from dependencies import get_db, get_auth_service
from services.auth_service import AuthService
from models.user import User, UserCreate
from schemas.user import (
    User as UserSchema, UserLogin,
    PasswordResetRequest, ChangePassword
)
from schemas.token import Token, TokenCreate, TokenPayload
from core.security import (
    get_password_hash, verify_password,
    create_access_token, create_refresh_token,
    get_current_user, get_current_active_user
)
from core.config import settings

router = APIRouter()

@router.post("/register", response_model=UserSchema)
def register_user(
    *,
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service),
    user_in: UserCreate
) -> Any:
    """
    Register a new user with username, email, and password.
    
    - **username**: Unique username (3-50 characters)
    - **email**: Valid email address (must be unique)
    - **password**: Secure password (8-100 characters)
    """
    user = auth_service.register_user(db, user_in)
    if not user:
        # Check which field caused the conflict
        existing_email = db.query(User).filter(User.email == user_in.email).first()
        existing_username = db.query(User).filter(User.username == user_in.username).first()
        
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        elif existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed"
            )
    
    return user

@router.post("/login", response_model=Token)
def login(
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    user = auth_service.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    tokens = auth_service.create_user_tokens(user.id)
    return tokens

@router.post("/refresh-token", response_model=Token)
def refresh_token(
    refresh_token: str = Body(..., embed=True),
    db: Session = Depends(get_db)
) -> Any:
    """
    Refresh access token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            refresh_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
        
        if token_data.type != "refresh":
            raise credentials_exception
            
        user = db.query(User).filter(User.id == token_data.sub).first()
        if user is None:
            raise credentials_exception
            
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        return {
            "access_token": create_access_token(
                user.id, expires_delta=access_token_expires
            ),
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user_id": str(user.id),
        }
        
    except (JWTError, ValidationError):
        raise credentials_exception

@router.post("/password-reset-request")
def password_reset_request(
    password_reset: PasswordResetRequest,
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
) -> Any:
    """
    Request password reset by generating a temporary password.
    Returns the temporary password for immediate use.
    In production, this should be sent via email.
    """
    temp_password = auth_service.reset_password_with_temporary(db, password_reset.email)
    
    if temp_password:
        # In production, send the temporary password via email
        # For development/testing, return it in the response
        return {
            "msg": "Password reset successful. Use the temporary password to login and then change your password.",
            "temporary_password": temp_password,
            "note": "In production, this password would be sent via email"
        }
    
    # Always return success to prevent user enumeration
    return {"msg": "If your email is registered, you will receive a password reset link."}

@router.post("/change-password")
def change_password(
    password_data: ChangePassword,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
) -> Any:
    """
    Change password for the current user.
    """
    success = auth_service.change_password(
        db, 
        current_user.id, 
        password_data.current_password, 
        password_data.new_password
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    return {"msg": "Password updated successfully"}

@router.post("/logout")
def logout(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
) -> Any:
    """
    Logout the current user.
    Note: In JWT-based authentication, logout is typically handled client-side
    by removing tokens from storage. This endpoint provides server-side logout
    tracking for audit purposes.
    """
    success = auth_service.logout_user(db, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Logout failed"
        )
    
    return {"msg": "Successfully logged out"}
