from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt

from backend.config import get_settings

settings = get_settings()


class TokenDecodeError(Exception):
    pass


def create_access_token(
    subject: str | int,
    expires_delta: timedelta | None = None,
    extra: dict[str, Any] | None = None,
) -> str:
    payload: dict[str, Any] = {
        "sub": str(subject),
        "exp": datetime.now(timezone.utc)
        + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes)),
    }
    if extra:
        payload.update(extra)

    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(
            token, settings.secret_key, algorithms=[settings.jwt_algorithm]
        )
    except JWTError as exc:
        raise TokenDecodeError("Invalid or expired token") from exc
