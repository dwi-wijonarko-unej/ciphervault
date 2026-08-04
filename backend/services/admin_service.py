from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.models import (
    ActivityLog,
    ApiKey,
    FileKey,
    PublicLink,
    Share,
    StoredFile,
    User,
)
from backend.utils.security import derive_key_hash, generate_salt, hash_password

settings = get_settings()


class AdminService:
    # ── User Management ──────────────────────────────────────────────

    @staticmethod
    def list_users(db: Session, page: int = 1, per_page: int = 20) -> dict[str, object]:
        total = db.query(func.count(User.id)).scalar() or 0
        users = (
            db.query(User)
            .order_by(User.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        return {
            "items": users,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": max(1, (total + per_page - 1) // per_page),
        }

    @staticmethod
    def get_user(db: Session, user_id: int) -> User:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return user

    @staticmethod
    def update_user_role(db: Session, user_id: int, role: str) -> User:
        if role not in ("admin", "user"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Role must be 'admin' or 'user'",
            )
        user = AdminService.get_user(db, user_id)
        user.role = role
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def set_user_active(db: Session, user_id: int, is_active: bool) -> User:
        user = AdminService.get_user(db, user_id)
        user.is_active = is_active
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def reset_user_password(db: Session, user_id: int, new_password: str) -> User:
        user = AdminService.get_user(db, user_id)
        salt = generate_salt()
        user.password_hash = hash_password(new_password)
        user.salt = salt
        user.derived_key_hash = derive_key_hash(
            new_password, salt, settings.pbkdf2_iterations
        )
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def delete_user(db: Session, user_id: int) -> None:
        user = AdminService.get_user(db, user_id)
        db.delete(user)
        db.commit()

    # ── System Stats ─────────────────────────────────────────────────

    @staticmethod
    def get_system_stats(db: Session) -> dict[str, object]:
        total_users = db.query(func.count(User.id)).scalar() or 0
        active_users = (
            db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
        )
        admin_users = (
            db.query(func.count(User.id)).filter(User.role == "admin").scalar() or 0
        )
        total_files = db.query(func.count(StoredFile.id)).scalar() or 0
        total_storage = db.query(func.sum(StoredFile.file_size_encrypted)).scalar() or 0
        total_shares = db.query(func.count(Share.id)).scalar() or 0
        active_shares = (
            db.query(func.count(Share.id)).filter(Share.revoked == False).scalar() or 0
        )
        total_public_links = db.query(func.count(PublicLink.id)).scalar() or 0
        active_public_links = (
            db.query(func.count(PublicLink.id))
            .filter(PublicLink.is_active == True)
            .scalar()
            or 0
        )
        total_api_keys = db.query(func.count(ApiKey.id)).scalar() or 0
        recent_activities = (
            db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(10).all()
        )

        return {
            "users": {
                "total": total_users,
                "active": active_users,
                "admins": admin_users,
            },
            "files": {
                "total": total_files,
                "storage_used_bytes": total_storage,
            },
            "shares": {
                "total": total_shares,
                "active": active_shares,
            },
            "public_links": {
                "total": total_public_links,
                "active": active_public_links,
            },
            "api_keys": total_api_keys,
            "recent_activities": recent_activities,
        }
