from __future__ import annotations

from math import gcd
from typing import Any

import numpy as np
from Crypto.Random import get_random_bytes

from backend.config import get_settings
from backend.crypto.logistic_map import logistic_map

settings = get_settings()


def _validate_modulus(modulus: int) -> int:
    if modulus not in (256, 257):
        raise ValueError("UHC modulus must be 256 or 257")
    return modulus


def _mod_inverse(value: int, modulus: int) -> int:
    if gcd(value, modulus) != 1:
        raise ValueError(f"No modular inverse for {value} under modulus {modulus}")

    t, new_t = 0, 1
    r, new_r = modulus, value % modulus

    while new_r != 0:
        quotient = r // new_r
        t, new_t = new_t, t - quotient * new_t
        r, new_r = new_r, r - quotient * new_r

    if t < 0:
        t += modulus

    return t


def matrix_mod_inverse(matrix: np.ndarray, modulus: int = 257) -> np.ndarray:
    mod = _validate_modulus(modulus)
    m = np.array(matrix, dtype=np.int64)

    if m.shape[0] != m.shape[1]:
        raise ValueError("Key matrix must be square")

    n = m.shape[0]
    aug = np.hstack([m % mod, np.eye(n, dtype=np.int64)])

    for col in range(n):
        pivot_row = None
        for row in range(col, n):
            candidate = int(aug[row, col] % mod)
            if candidate != 0 and gcd(candidate, mod) == 1:
                pivot_row = row
                break

        if pivot_row is None:
            raise ValueError("Matrix is not invertible under the selected modulus")

        if pivot_row != col:
            aug[[col, pivot_row]] = aug[[pivot_row, col]]

        pivot = int(aug[col, col] % mod)
        inv_pivot = _mod_inverse(pivot, mod)
        aug[col] = (aug[col] * inv_pivot) % mod

        for row in range(n):
            if row == col:
                continue
            factor = int(aug[row, col] % mod)
            if factor:
                aug[row] = (aug[row] - factor * aug[col]) % mod

    return aug[:, n:] % mod


def generate_key_matrix(
    matrix_size: int,
    seed_source: bytes | str | int | float,
    modulus: int | None = None,
    r: float | None = None,
) -> np.ndarray:
    if matrix_size <= 1:
        raise ValueError("matrix_size must be > 1")

    mod = _validate_modulus(modulus if modulus is not None else settings.uhc_modulus)
    sequence_len = (matrix_size * (matrix_size - 1) // 2) + (matrix_size - 1)
    seq = logistic_map(seed_source, sequence_len, r=r, modulus=mod)

    key = np.eye(matrix_size, dtype=np.int64)
    idx = 0

    for i in range(matrix_size):
        for j in range(i + 1, matrix_size):
            key[i, j] = int(seq[idx] % mod)
            idx += 1

    for row in range(1, matrix_size):
        factor = int(seq[idx] % mod)
        key[row] = (key[row] + factor * key[0]) % mod
        idx += 1

    return key % mod


def _pack_cipher(values: np.ndarray, modulus: int) -> bytes:
    if modulus == 256:
        return bytes(values.astype(np.uint8).tolist())

    packed = bytearray()
    for val in values.astype(np.int64):
        packed.extend(int(val).to_bytes(2, byteorder="big", signed=False))
    return bytes(packed)


def _unpack_cipher(ciphertext: bytes, modulus: int) -> np.ndarray:
    if modulus == 256:
        return np.frombuffer(ciphertext, dtype=np.uint8).astype(np.int64)

    if len(ciphertext) % 2 != 0:
        raise ValueError("Invalid mod-257 ciphertext length")

    values = [
        int.from_bytes(ciphertext[i : i + 2], byteorder="big", signed=False)
        for i in range(0, len(ciphertext), 2)
    ]
    return np.array(values, dtype=np.int64)


def _map_plain(data: bytes, modulus: int) -> np.ndarray:
    arr = np.frombuffer(data, dtype=np.uint8).astype(np.int64)
    if modulus == 257:
        return arr + 1
    return arr


def _unmap_plain(values: np.ndarray, modulus: int) -> bytes:
    if modulus == 257:
        # map back 1..256 -> 0..255
        return bytes(((values - 1) % 257).astype(np.uint8).tolist())
    return bytes((values % 256).astype(np.uint8).tolist())


def uhc_encrypt(
    plaintext: bytes,
    key_matrix: np.ndarray,
    modulus: int | None = None,
    iv: bytes | None = None,
) -> tuple[bytes, bytes, dict[str, Any]]:
    mod = _validate_modulus(modulus if modulus is not None else settings.uhc_modulus)
    key = np.array(key_matrix, dtype=np.int64) % mod

    if key.shape[0] != key.shape[1]:
        raise ValueError("key_matrix must be square")

    n = key.shape[0]
    mapped = _map_plain(plaintext, mod)

    pad_len = (-len(mapped)) % n
    if pad_len:
        mapped = np.concatenate([mapped, np.zeros(pad_len, dtype=np.int64)])

    plain_matrix = mapped.reshape(n, -1)
    cipher_matrix = (key @ plain_matrix) % mod
    cipher_flat = cipher_matrix.reshape(-1)

    iv_value = iv or get_random_bytes(16)
    metadata = {
        "original_length": len(plaintext),
        "pad_length": pad_len,
        "matrix_size": n,
        "modulus": mod,
    }

    return _pack_cipher(cipher_flat, mod), iv_value, metadata


def uhc_decrypt(
    ciphertext: bytes,
    key_matrix: np.ndarray,
    modulus: int | None = None,
    metadata: dict[str, Any] | None = None,
) -> bytes:
    mod = _validate_modulus(modulus if modulus is not None else settings.uhc_modulus)
    key = np.array(key_matrix, dtype=np.int64) % mod

    if key.shape[0] != key.shape[1]:
        raise ValueError("key_matrix must be square")

    n = key.shape[0]
    encrypted_values = _unpack_cipher(ciphertext, mod)

    if len(encrypted_values) % n != 0:
        raise ValueError("Cipher length is not aligned with matrix size")

    cipher_matrix = encrypted_values.reshape(n, -1)
    inv_key = matrix_mod_inverse(key, mod)
    plain_mapped = (inv_key @ cipher_matrix) % mod
    plain_flat = plain_mapped.reshape(-1)
    restored = _unmap_plain(plain_flat, mod)

    if metadata and "original_length" in metadata:
        return restored[: int(metadata["original_length"])]

    return restored
