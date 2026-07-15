import os

from backend.crypto.ai_selector import (
    adaptive_split,
    choose_matrix_size_by_split,
    extract_features,
    pilih_matriks_ai,
)


def test_extract_features_returns_expected_keys():
    payload = b"abc" * 100
    features = extract_features(payload, extension=".txt")

    assert set(features.keys()) == {
        "size",
        "entropy",
        "mean",
        "std",
        "unique_bytes",
        "extension",
    }
    assert features["size"] == len(payload)
    assert features["extension"] == ".txt"


def test_adaptive_split_for_text_extension_low_entropy():
    features = {
        "size": 2048,
        "entropy": 3.2,
        "mean": 70.0,
        "std": 1.0,
        "unique_bytes": 4,
        "extension": ".txt",
    }
    assert adaptive_split(features) == 0.90


def test_adaptive_split_for_very_large_file():
    features = {
        "size": 600 * 1024 * 1024,
        "entropy": 7.9,
        "mean": 120.0,
        "std": 22.0,
        "unique_bytes": 255,
        "extension": ".bin",
    }
    assert adaptive_split(features) == 0.999


def test_pilih_matriks_ai_respects_size_entropy_rule():
    low_entropy_small = b"A" * 40000
    high_entropy_small = os.urandom(40000)

    assert pilih_matriks_ai(low_entropy_small) == 4
    assert pilih_matriks_ai(high_entropy_small) == 6


def test_choose_matrix_size_by_split_returns_supported_size():
    n = choose_matrix_size_by_split(1_000_000, 0.95)
    assert n in {4, 6, 8, 12, 16, 24, 32, 48}
