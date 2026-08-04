import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.models import ApiKey, User

settings = get_settings()

KEY_PREFIX = "cv_"


def _hash_key(raw_key: str) -> str:
    """HMAC-SHA256 hash of the raw API key using the app secret."""
    return hmac.new(
        settings.secret_key.encode(), raw_key.encode(), hashlib.sha256
    ).hexdigest()


def _generate_raw_key() -> str:
    return KEY_PREFIX + secrets.token_urlsafe(32)


class ApiKeyService:
    @staticmethod
    def create_key(
        db: Session,
        user: User,
        label: str,
        expires_in_days: int | None = None,
    ) -> tuple[ApiKey, str]:
        """Create a new API key. Returns (model, raw_key).

        The raw_key is only returned here — it must never be retrievable again.
        """
        raw_key = _generate_raw_key()
        key_hash = _hash_key(raw_key)

        expires_at = None
        if expires_in_days is not None:
            expires_at = datetime.now(timezone.utc) + timedelta(days=expires_in_days)

        api_key = ApiKey(
            user_id=user.id,
            key_hash=key_hash,
            key_prefix=raw_key[:12],
            label=label,
            is_active=True,
            expires_at=expires_at,
        )
        db.add(api_key)
        db.commit()
        db.refresh(api_key)
        return api_key, raw_key

    @staticmethod
    def list_keys(db: Session, user: User) -> list[ApiKey]:
        return (
            db.query(ApiKey)
            .filter(ApiKey.user_id == user.id)
            .order_by(ApiKey.created_at.desc())
            .all()
        )

    @staticmethod
    def revoke_key(db: Session, user: User, key_id: int) -> None:
        api_key = (
            db.query(ApiKey)
            .filter(ApiKey.id == key_id, ApiKey.user_id == user.id)
            .first()
        )
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found",
            )
        db.delete(api_key)
        db.commit()

    @staticmethod
    def authenticate(raw_key: str, db: Session) -> User | None:
        """Look up a user by raw API key. Returns None if invalid.

        Checks: key exists, is active, not expired. Updates last_used on success.
        """
        key_hash = _hash_key(raw_key)
        api_key = db.query(ApiKey).filter(ApiKey.key_hash == key_hash).first()
        if not api_key or not api_key.is_active:
            return None

        if api_key.expires_at is not None:
            exp = api_key.expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > exp:
                return None

        user = db.query(User).filter(User.id == api_key.user_id).first()
        if not user or not user.is_active:
            return None

        api_key.last_used = datetime.now(timezone.utc)
        db.commit()
        return user
