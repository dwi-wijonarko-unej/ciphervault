from __future__ import annotations

import math
from collections import Counter
from typing import Iterable

import numpy as np

SUPPORTED_MATRIX_SIZES = (4, 6, 8, 12, 16, 24, 32, 48)

SIZE_TIERS = [
    (4 * 1024, 0),
    (32 * 1024, 1),
    (128 * 1024, 2),
    (1024 * 1024, 3),
    (16 * 1024 * 1024, 4),
    (256 * 1024 * 1024, 5),
    (1024 * 1024 * 1024, 6),
    (float("inf"), 7),
]

ENTROPY_BANDS = [
    (3.0, -1),
    (5.0, 0),
    (6.5, 1),
    (7.5, 2),
    (float("inf"), 2),
]

TYPE_ADJUSTMENT = {
    "text": -1,
    "structured": 0,
    "compressed": 1,
    "binary": 1,
    "unknown": 0,
}

EXTENSION_MAP = {
    "text": {".txt", ".csv", ".json", ".xml", ".log", ".md"},
    "structured": {".pdf", ".docx", ".xlsx", ".xls", ".pptx"},
    "compressed": {".zip", ".gz", ".rar", ".7z", ".png", ".jpg", ".jpeg", ".webp"},
    "binary": {".exe", ".dll", ".so", ".bin", ".dat"},
}

R_BANDS = [
    (4.0, 3.99),
    (6.0, 3.96),
    (7.5, 3.923),
    (float("inf"), 3.90),
]


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


def classify_file_type(
    extension: str | None, features: dict[str, float | int | str] | None = None
) -> str:
    ext = (extension or "").lower()
    for file_class, exts in EXTENSION_MAP.items():
        if ext in exts:
            return file_class

    # Backward-compat fallback for unknown extension using entropy hint if available.
    entropy = float((features or {}).get("entropy", 0.0))
    if entropy >= 7.5:
        return "compressed"
    return "unknown"


def select_r(entropy: float) -> float:
    return next(r_val for threshold, r_val in R_BANDS if entropy < threshold)


def adaptive_matrix(
    features: dict[str, float | int | str], file_class: str
) -> tuple[int, float, dict[str, object]]:
    size = int(features.get("size", 0))
    entropy = float(features.get("entropy", 0.0))
    extension = str(features.get("extension", "")).lower()

    base_index = next(idx for threshold, idx in SIZE_TIERS if size < threshold)
    entropy_adjustment = next(
        adj for threshold, adj in ENTROPY_BANDS if entropy < threshold
    )
    type_adjustment = TYPE_ADJUSTMENT.get(file_class, 0)

    final_index = max(0, min(base_index + entropy_adjustment + type_adjustment, 7))
    matrix_size = SUPPORTED_MATRIX_SIZES[final_index]
    adaptive_r = select_r(entropy)

    trace: dict[str, object] = {
        "strategy": "multi_feature_adaptive",
        "file_class": file_class,
        "features_snapshot": {
            "size": size,
            "entropy": round(entropy, 4),
            "mean": round(float(features.get("mean", 0.0)), 4),
            "std": round(float(features.get("std", 0.0)), 4),
            "unique_bytes": int(features.get("unique_bytes", 0)),
            "extension": extension,
        },
        "decision": {
            "base_index": base_index,
            "base_size": SUPPORTED_MATRIX_SIZES[base_index],
            "entropy_adjustment": entropy_adjustment,
            "type_adjustment": type_adjustment,
            "final_index": final_index,
            "matrix_size": matrix_size,
            "adaptive_r": adaptive_r,
        },
        "reasoning": (
            f"{file_class} file ({extension or 'n/a'}), entropy {entropy:.2f}, "
            f"base idx {base_index}, entropy adj {entropy_adjustment}, "
            f"type adj {type_adjustment}"
        ),
    }

    return matrix_size, adaptive_r, trace
