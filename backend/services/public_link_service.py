from __future__ import annotations

import hashlib
import hmac
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.models import PublicLink, StoredFile, User
from backend.utils.security import hash_password, verify_password

settings = get_settings()


def _generate_token(file_id: int, owner_id: int) -> str:
    """HMAC-SHA256 token: file_id.owner_id.timestamp signed with SECRET_KEY."""
    payload = f"{file_id}.{owner_id}.{datetime.now(timezone.utc).isoformat()}"
    sig = hmac.new(
        settings.secret_key.encode(), payload.encode(), hashlib.sha256
    ).hexdigest()
    return f"pl_{sig}"


def _ensure_aware(dt: datetime | None) -> datetime | None:
    """SQLite may return naive datetimes; attach UTC if missing."""
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


class PublicLinkService:
    @staticmethod
    def create_link(
        db: Session,
        file_id: int,
        owner: User,
        password: str | None = None,
        max_access: int | None = None,
        expires_in_hours: int | None = None,
    ) -> PublicLink:
        file = (
            db.query(StoredFile)
            .filter(StoredFile.id == file_id, StoredFile.owner_id == owner.id)
            .first()
        )
        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found or you do not own it",
            )

        token = _generate_token(file_id, owner.id)
        pw_hash = hash_password(password) if password else None

        expires_at = None
        if expires_in_hours is not None:
            expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_in_hours)

        link = PublicLink(
            file_id=file_id,
            owner_id=owner.id,
            token=token,
            password_hash=pw_hash,
            max_access=max_access,
            is_active=True,
            expires_at=expires_at,
        )
        db.add(link)
        db.commit()
        db.refresh(link)
        return link

    @staticmethod
    def list_links(db: Session, file_id: int, owner: User) -> list[PublicLink]:
        file = (
            db.query(StoredFile)
            .filter(StoredFile.id == file_id, StoredFile.owner_id == owner.id)
            .first()
        )
        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found or you do not own it",
            )
        return (
            db.query(PublicLink)
            .filter(PublicLink.file_id == file_id, PublicLink.owner_id == owner.id)
            .order_by(PublicLink.created_at.desc())
            .all()
        )

    @staticmethod
    def revoke_link(db: Session, link_id: int, owner: User) -> None:
        link = (
            db.query(PublicLink)
            .filter(PublicLink.id == link_id, PublicLink.owner_id == owner.id)
            .first()
        )
        if not link:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Public link not found",
            )
        db.delete(link)
        db.commit()

    @staticmethod
    def verify_and_get_file(
        db: Session,
        token: str,
        password: str | None = None,
    ) -> tuple[StoredFile, User]:
        """Verify a public link token. Returns (file, owner).

        Raises 404/403/410 as appropriate. Increments access_count on success.
        """
        link = db.query(PublicLink).filter(PublicLink.token == token).first()
        if not link or not link.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Public link not found or has been revoked",
            )

        # Check expiry
        expires_at = _ensure_aware(link.expires_at)
        if expires_at is not None and datetime.now(timezone.utc) > expires_at:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="This public link has expired",
            )

        # Check max access
        if link.max_access is not None and link.access_count >= link.max_access:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="This public link has reached its download limit",
            )

        # Check password
        if link.password_hash is not None:
            if not password or not verify_password(password, link.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Password required or incorrect password",
                )

        file = db.query(StoredFile).filter(StoredFile.id == link.file_id).first()
        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File no longer exists",
            )

        owner = db.query(User).filter(User.id == link.owner_id).first()
        if not owner or not owner.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File owner account is no longer available",
            )

        # Increment access count
        link.access_count += 1
        db.commit()

        return file, owner
