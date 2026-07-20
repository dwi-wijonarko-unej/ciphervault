from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.middleware.auth_middleware import get_current_user
from backend.models import User
from backend.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)
from backend.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse)
def register(
    payload: RegisterRequest, db: Session = Depends(get_db)
) -> RegisterResponse:
    user = AuthService.register_user(
        db, payload.username, payload.email, payload.password
    )
    return RegisterResponse(
        message="Registration successful", user=AuthService.to_user_response(user)
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = AuthService.authenticate_user(db, payload)
    token = AuthService.create_token(user)
    return TokenResponse(
        access_token=token, token_type="bearer", user=AuthService.to_user_response(user)
    )


@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest, db: Session = Depends(get_db)
) -> dict[str, str]:
    return AuthService.reset_password(
        db, payload.username, payload.email, payload.new_password
    )


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return AuthService.to_user_response(current_user)
