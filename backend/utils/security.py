import base64
import hashlib
import secrets

import bcrypt

from backend.config import get_settings

settings = get_settings()


def generate_salt(length: int = 16) -> str:
    return base64.urlsafe_b64encode(secrets.token_bytes(length)).decode("utf-8")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def derive_key_hash(
    password: str, salt: str, iterations: int | None = None, key_len: int = 32
) -> str:
    rounds = iterations or settings.pbkdf2_iterations
    raw = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        rounds,
        dklen=key_len,
    )
    return raw.hex()
