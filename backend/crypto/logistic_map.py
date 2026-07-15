from __future__ import annotations

import hashlib
from typing import Union

import numpy as np

from backend.config import get_settings

settings = get_settings()
SeedInput = Union[bytes, bytearray, str, int, float]


def _normalize_seed(seed_source: SeedInput) -> float:
    if isinstance(seed_source, float):
        x0 = seed_source
    elif isinstance(seed_source, int):
        x0 = abs(seed_source % 1_000_003) / 1_000_003
    elif isinstance(seed_source, str):
        digest = hashlib.sha256(seed_source.encode("utf-8")).digest()
        x0 = int.from_bytes(digest, "big") / (2**256 - 1)
    else:
        digest = hashlib.sha256(bytes(seed_source)).digest()
        x0 = int.from_bytes(digest, "big") / (2**256 - 1)

    if x0 <= 0.0:
        x0 = 1e-6
    if x0 >= 1.0:
        x0 = 1.0 - 1e-6
    return x0


def logistic_map(
    seed_source: SeedInput,
    count: int,
    r: float | None = None,
    warmup: int = 1000,
    modulus: int = 257,
) -> np.ndarray:
    if count < 0:
        raise ValueError("count must be >= 0")

    r_value = r if r is not None else settings.uhc_logistic_r
    x = _normalize_seed(seed_source)

    for _ in range(warmup):
        x = r_value * x * (1.0 - x)

    seq = np.zeros(count, dtype=np.int64)
    for i in range(count):
        x = r_value * x * (1.0 - x)
        seq[i] = int(x * 1_000_000) % modulus

    return seq
