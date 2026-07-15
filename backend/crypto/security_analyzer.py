from __future__ import annotations

import math
import zlib
from collections import Counter
from typing import Any

import numpy as np


def _entropy(data: np.ndarray) -> float:
    if data.size == 0:
        return 0.0
    counts = Counter(data.tolist())
    probs = [c / data.size for c in counts.values()]
    return float(-sum(p * math.log2(p) for p in probs if p > 0))


def _correlation(data: np.ndarray) -> float:
    if data.size < 2:
        return 0.0
    x = data[:-1].astype(np.float64)
    y = data[1:].astype(np.float64)
    std_x = np.std(x)
    std_y = np.std(y)
    if std_x == 0 or std_y == 0:
        return 0.0
    return float(np.corrcoef(x, y)[0, 1])


def _flip_one_bit(data: bytes) -> bytes:
    if not data:
        return data
    arr = bytearray(data)
    arr[0] ^= 0b00000001
    return bytes(arr)


def _bit_change_ratio(a: bytes, b: bytes) -> float:
    if not a or not b:
        return 0.0
    n = min(len(a), len(b))
    changed_bits = 0
    total_bits = n * 8
    for i in range(n):
        changed_bits += (a[i] ^ b[i]).bit_count()
    return round((changed_bits / total_bits) * 100, 4)


def _npcr_uaci(a: np.ndarray, b: np.ndarray) -> tuple[float, float]:
    if a.size == 0 or b.size == 0:
        return 0.0, 0.0
    n = min(a.size, b.size)
    a = a[:n].astype(np.int64)
    b = b[:n].astype(np.int64)
    diff = a != b
    npcr = float(np.sum(diff) / n * 100)
    uaci = float(np.mean(np.abs(a - b)) / 255 * 100)
    return round(npcr, 4), round(uaci, 4)


def _chi_square_uniform(data: np.ndarray) -> float:
    if data.size == 0:
        return 0.0
    hist = np.bincount(data, minlength=256)
    expected = data.size / 256
    if expected == 0:
        return 0.0
    chi = np.sum(((hist - expected) ** 2) / expected)
    return float(round(chi, 4))


def _mutual_information(data: np.ndarray) -> float:
    if data.size < 2:
        return 0.0
    x = data[:-1]
    y = data[1:]
    joint = np.histogram2d(x, y, bins=256)[0]
    joint_prob = joint / np.sum(joint)
    x_prob = np.sum(joint_prob, axis=1)
    y_prob = np.sum(joint_prob, axis=0)

    mi = 0.0
    for i in range(256):
        for j in range(256):
            pxy = joint_prob[i, j]
            if pxy > 0 and x_prob[i] > 0 and y_prob[j] > 0:
                mi += pxy * math.log2(pxy / (x_prob[i] * y_prob[j]))
    return float(round(mi, 4))


def _compression_ratio(data: bytes) -> float:
    if not data:
        return 1.0
    compressed = zlib.compress(data, level=9)
    return round(len(compressed) / len(data), 4)


def _score(metrics: dict[str, float]) -> int:
    score = 0.0
    entropy = metrics["entropy"]
    correlation = abs(metrics["correlation"])
    avalanche = metrics["avalanche"]
    npcr = metrics["npcr"]
    uaci = metrics["uaci"]
    bit_change = metrics["bit_change"]

    score += min(max((entropy / 8.0) * 30, 0), 30)
    score += min(max((1 - min(correlation, 1)) * 10, 0), 10)
    score += min(max((1 - abs(50 - avalanche) / 50) * 15, 0), 15)
    score += min(max((npcr / 100) * 15, 0), 15)
    score += min(max((1 - abs(33 - uaci) / 33) * 15, 0), 15)
    score += min(max((1 - abs(50 - bit_change) / 50) * 15, 0), 15)

    return int(round(min(max(score, 0), 100)))


def analyze_file(
    ciphertext: bytes, flipped_ciphertext: bytes | None = None
) -> dict[str, Any]:
    arr = np.frombuffer(ciphertext, dtype=np.uint8)

    if flipped_ciphertext is not None:
        flipped_arr = np.frombuffer(flipped_ciphertext, dtype=np.uint8)
        npcr, uaci = _npcr_uaci(arr, flipped_arr)
        bit_change = _bit_change_ratio(ciphertext, flipped_ciphertext)
    else:
        flipped = _flip_one_bit(ciphertext)
        flipped_arr = np.frombuffer(flipped, dtype=np.uint8)
        npcr, uaci = _npcr_uaci(arr, flipped_arr)
        bit_change = _bit_change_ratio(ciphertext, flipped)

    metrics: dict[str, float] = {
        "entropy": round(_entropy(arr), 4),
        "correlation": round(_correlation(arr), 4),
        "avalanche": round(bit_change, 4),
        "chi_square": _chi_square_uniform(arr),
        "npcr": npcr,
        "uaci": uaci,
        "bit_change": bit_change,
        "mutual_information": _mutual_information(arr),
        "compression_ratio": _compression_ratio(ciphertext),
    }

    return {
        "score": _score(metrics),
        "metrics": metrics,
    }
