from __future__ import annotations

from backend.crypto.metadata_generator import compute_sha256


def verify_integrity(data: bytes, expected_hash: str) -> bool:
    return compute_sha256(data) == expected_hash
