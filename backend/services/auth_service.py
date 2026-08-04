from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.models import User
from backend.schemas.auth import LoginRequest, UserResponse
from backend.utils.security import (
    derive_key_hash,
    generate_salt,
    hash_password,
    verify_password,
)
from backend.utils.token import create_access_token

settings = get_settings()


class AuthService:
    @staticmethod
    def register_user(db: Session, username: str, email: str, password: str) -> User:
        existing = (
            db.query(User)
            .filter(or_(User.username == username, User.email == email))
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username or email already exists",
            )

        salt = generate_salt()
        user = User(
            username=username,
            email=email,
            password_hash=hash_password(password),
            salt=salt,
            derived_key_hash=derive_key_hash(
                password, salt, settings.pbkdf2_iterations
            ),
            role="user",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def authenticate_user(db: Session, payload: LoginRequest) -> User:
        user = db.query(User).filter(User.username == payload.username).first()
        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated. Contact an administrator.",
            )
        return user

    @staticmethod
    def create_token(user: User) -> str:
        return create_access_token(subject=user.id)

    @staticmethod
    def reset_password(
        db: Session, username: str, email: str, new_password: str
    ) -> dict[str, str]:
        user = db.query(User).filter(User.username == username).first()
        if not user or user.email != email:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Username or email not found",
            )

        # Regenerate salt and re-derive everything
        salt = generate_salt()
        user.password_hash = hash_password(new_password)
        user.salt = salt
        user.derived_key_hash = derive_key_hash(
            new_password, salt, settings.pbkdf2_iterations
        )
        db.commit()

        return {
            "message": "Password reset successful. Please login with your new password."
        }

    @staticmethod
    def to_user_response(user: User) -> UserResponse:
        return UserResponse.model_validate(user)
