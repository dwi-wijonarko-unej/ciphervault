from __future__ import annotations

import math
from collections import Counter
from typing import Iterable

import numpy as np

SUPPORTED_MATRIX_SIZES = (4, 6, 8, 12, 16, 24, 32, 48)


def _entropy(data: bytes) -> float:
    if not data:
        return 0.0
    counts = Counter(data)
    probs = [c / len(data) for c in counts.values()]
    return -sum(p * math.log2(p) for p in probs)


def extract_features(
    file_bytes: bytes, extension: str | None = None
) -> dict[str, float | int | str]:
    arr = np.frombuffer(file_bytes, dtype=np.uint8)
    ext = (extension or "").lower()

    return {
        "size": int(arr.size),
        "entropy": float(_entropy(file_bytes)),
        "mean": float(np.mean(arr)) if arr.size else 0.0,
        "std": float(np.std(arr)) if arr.size else 0.0,
        "unique_bytes": int(np.unique(arr).size) if arr.size else 0,
        "extension": ext,
    }


def adaptive_split(features: dict[str, float | int | str]) -> float:
    size_mb = float(features.get("size", 0)) / (1024 * 1024)
    entropy = float(features.get("entropy", 0.0))
    extension = str(features.get("extension", "")).lower()

    if size_mb > 500:
        return 0.999
    if size_mb > 100:
        return 0.995
    if size_mb > 10:
        return 0.990
    if entropy > 7.5:
        return 0.985
    if extension in {".txt", ".csv", ".json"}:
        return 0.90
    return 0.95


def pilih_matriks_ai(file_bytes: bytes) -> int:
    features = extract_features(file_bytes)
    filesize = int(features["size"])
    entropy = float(features["entropy"])

    if filesize < 50_000:
        return 4 if entropy < 5 else 6
    if filesize < 500_000:
        return 8 if entropy < 6 else 12
    if filesize < 5_000_000:
        return 16 if entropy < 7 else 24
    return 32 if entropy < 7.5 else 48


def choose_matrix_size_by_split(
    data_length: int,
    split_ratio: float,
    supported_sizes: Iterable[int] = SUPPORTED_MATRIX_SIZES,
    fallback: int = 8,
) -> int:
    if data_length <= 0:
        return fallback

    hill_len = max(int(data_length * split_ratio), 1)
    estimated = int(math.sqrt(hill_len))

    sizes = sorted(set(int(s) for s in supported_sizes if int(s) > 0))
    if not sizes:
        return fallback

    eligible = [s for s in sizes if s <= estimated]
    return eligible[-1] if eligible else sizes[0]
