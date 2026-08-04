"""Idempotent database seeder for default admin and user accounts.

Run on every startup; existing accounts are never overwritten.
"""

from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.database import SessionLocal
from backend.models import User
from backend.utils.security import derive_key_hash, generate_salt, hash_password

settings = get_settings()

DEFAULT_ACCOUNTS = [
    {
        "username": "admin",
        "email": "admin@ciphervault.io",
        "password": "Admin123!",
        "role": "admin",
    },
    {
        "username": "user",
        "email": "user@ciphervault.io",
        "password": "User123!",
        "role": "user",
    },
]


def _create_account(db: Session, account: dict) -> None:
    existing = db.query(User).filter(User.username == account["username"]).first()
    if existing:
        return

    salt = generate_salt()
    user = User(
        username=account["username"],
        email=account["email"],
        password_hash=hash_password(account["password"]),
        salt=salt,
        derived_key_hash=derive_key_hash(
            account["password"], salt, settings.pbkdf2_iterations
        ),
        role=account["role"],
        is_active=True,
    )
    db.add(user)
    db.commit()


def run_seeders() -> None:
    db = SessionLocal()
    try:
        for account in DEFAULT_ACCOUNTS:
            _create_account(db, account)
    finally:
        db.close()
