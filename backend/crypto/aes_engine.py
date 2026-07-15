from __future__ import annotations

import hashlib
from typing import Tuple

from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad


def _normalize_key(key: bytes) -> bytes:
    if len(key) in (16, 24, 32):
        return key
    return hashlib.sha256(key).digest()


def aes_encrypt(
    data: bytes, key: bytes, iv: bytes | None = None
) -> Tuple[bytes, bytes]:
    normalized_key = _normalize_key(key)
    iv_value = iv or get_random_bytes(AES.block_size)
    cipher = AES.new(normalized_key, AES.MODE_CBC, iv=iv_value)
    encrypted = cipher.encrypt(pad(data, AES.block_size))
    return encrypted, iv_value


def aes_decrypt(ciphertext: bytes, key: bytes, iv: bytes) -> bytes:
    normalized_key = _normalize_key(key)
    cipher = AES.new(normalized_key, AES.MODE_CBC, iv=iv)
    decrypted_padded = cipher.decrypt(ciphertext)
    try:
        return unpad(decrypted_padded, AES.block_size)
    except ValueError as exc:
        raise ValueError("Invalid ciphertext or key/iv (padding check failed)") from exc
