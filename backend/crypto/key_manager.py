from __future__ import annotations

import hashlib
from base64 import urlsafe_b64decode, urlsafe_b64encode

from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad

from backend.config import get_settings
from backend.crypto.rsa_engine import rsa_decrypt, rsa_encrypt

settings = get_settings()


def _normalize_key(key: bytes) -> bytes:
    if len(key) in (16, 24, 32):
        return key
    return hashlib.sha256(key).digest()


def generate_session_key(length: int | None = None) -> bytes:
    return get_random_bytes(length or settings.session_key_bytes)


def derive_user_key(secret: str, salt: str, iterations: int | None = None) -> bytes:
    rounds = iterations or settings.pbkdf2_iterations
    return hashlib.pbkdf2_hmac(
        "sha256",
        secret.encode("utf-8"),
        salt.encode("utf-8"),
        rounds,
        dklen=32,
    )


def wrap_key(session_key: bytes, user_key: bytes) -> str:
    cipher = AES.new(_normalize_key(user_key), AES.MODE_ECB)
    wrapped = cipher.encrypt(pad(session_key, AES.block_size))
    return urlsafe_b64encode(wrapped).decode("utf-8")


def unwrap_key(wrapped_key_b64: str, user_key: bytes) -> bytes:
    wrapped = urlsafe_b64decode(wrapped_key_b64.encode("utf-8"))
    cipher = AES.new(_normalize_key(user_key), AES.MODE_ECB)
    return unpad(cipher.decrypt(wrapped), AES.block_size)


def rsa_wrap_key(session_key: bytes) -> str:
    wrapped = rsa_encrypt(session_key)
    return urlsafe_b64encode(wrapped).decode("utf-8")


def rsa_unwrap_key(rsa_wrapped_key_b64: str) -> bytes:
    wrapped = urlsafe_b64decode(rsa_wrapped_key_b64.encode("utf-8"))
    return rsa_decrypt(wrapped)
