"""Idempotent database seeder for default admin and user accounts.

Run on every startup; existing accounts are never overwritten.
"""

import os
import secrets
from pathlib import Path

from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.database import SessionLocal
from backend.models import User
from backend.utils.security import derive_key_hash, generate_salt, hash_password

settings = get_settings()

SEED_CREDENTIALS_FILE = Path(
    os.environ.get("SEED_CREDENTIALS_FILE", "./data/.seed-credentials")
)

DEFAULT_ACCOUNTS = [
    {"username": "admin", "email": "admin@ciphervault.io", "role": "admin"},
    {"username": "user", "email": "user@ciphervault.io", "role": "user"},
]


def _random_password(length: int = 20) -> str:
    return secrets.token_urlsafe(length)[:length]


def _record_password(username: str, password: str) -> None:
    SEED_CREDENTIALS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SEED_CREDENTIALS_FILE, "a", encoding="utf-8") as fh:
        fh.write(f"{username}:{password}\n")
    os.chmod(SEED_CREDENTIALS_FILE, 0o600)


def _create_account(db: Session, account: dict) -> None:
    existing = db.query(User).filter(User.username == account["username"]).first()
    if existing:
        return

    password = _random_password()
    salt = generate_salt()
    user = User(
        username=account["username"],
        email=account["email"],
        password_hash=hash_password(password),
        salt=salt,
        derived_key_hash=derive_key_hash(
            password, salt, settings.pbkdf2_iterations
        ),
        role=account["role"],
        is_active=True,
    )
    db.add(user)
    db.commit()
    _record_password(account["username"], password)


def run_seeders() -> None:
    db = SessionLocal()
    try:
        for account in DEFAULT_ACCOUNTS:
            _create_account(db, account)
    finally:
        db.close()
