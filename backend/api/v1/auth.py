from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Any

from dependencies import get_db, get_auth_service
from services.auth_service import AuthService
from models.user import User, UserCreate
from schemas.user import (
    User as UserSchema, UserLogin,
    PasswordResetRequest, PasswordResetConfirm, ChangePassword
)
from schemas.token import Token, TokenCreate
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
    Register a new user.
    """
    user = auth_service.register_user(db, user_in)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
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
        }
        
    except (JWTError, ValidationError):
        raise credentials_exception

@router.post("/password-reset-request")
def password_reset_request(
    password_reset: PasswordResetRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Request password reset.
    """
    user = db.query(User).filter(User.email == password_reset.email).first()
    if user:
        # In a real app, you would send an email with a reset token
        # For now, we'll just return a success message
        pass
    
    # Always return success to prevent user enumeration
    return {"msg": "If your email is registered, you will receive a password reset link."}

@router.post("/password-reset-confirm")
def password_reset_confirm(
    password_reset: PasswordResetConfirm,
    db: Session = Depends(get_db)
) -> Any:
    """
    Confirm password reset.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid or expired token",
    )
    
    try:
        payload = jwt.decode(
            password_reset.token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
        
        if token_data.type != "password_reset":
            raise credentials_exception
            
        user = db.query(User).filter(User.id == token_data.sub).first()
        if user is None:
            raise credentials_exception
            
        # Update password
        user.hashed_password = get_password_hash(password_reset.new_password)
        db.commit()
        
        return {"msg": "Password updated successfully"}
        
    except (JWTError, ValidationError):
        raise credentials_exception

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
