import os

from backend.crypto.ai_selector import (
    adaptive_matrix,
    adaptive_split,
    choose_matrix_size_by_split,
    classify_file_type,
    extract_features,
    pilih_matriks_ai,
    select_r,
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


def test_classify_file_type_by_extension():
    assert classify_file_type(".csv") == "text"
    assert classify_file_type(".pdf") == "structured"
    assert classify_file_type(".png") == "compressed"
    assert classify_file_type(".bin") == "binary"
    assert classify_file_type(".unknown") == "unknown"


def test_adaptive_matrix_variation_for_same_size_different_type_entropy():
    size = 50 * 1024

    csv_features = {
        "size": size,
        "entropy": 3.5,
        "mean": 95.0,
        "std": 12.0,
        "unique_bytes": 64,
        "extension": ".csv",
    }
    pdf_features = {
        "size": size,
        "entropy": 6.8,
        "mean": 118.0,
        "std": 32.0,
        "unique_bytes": 180,
        "extension": ".pdf",
    }
    xls_features = {
        "size": size,
        "entropy": 5.2,
        "mean": 112.0,
        "std": 25.0,
        "unique_bytes": 150,
        "extension": ".xls",
    }
    png_features = {
        "size": size,
        "entropy": 7.6,
        "mean": 127.0,
        "std": 74.0,
        "unique_bytes": 256,
        "extension": ".png",
    }

    csv_matrix, csv_r, _ = adaptive_matrix(csv_features, classify_file_type(".csv"))
    pdf_matrix, pdf_r, _ = adaptive_matrix(pdf_features, classify_file_type(".pdf"))
    xls_matrix, xls_r, _ = adaptive_matrix(xls_features, classify_file_type(".xls"))
    png_matrix, png_r, _ = adaptive_matrix(png_features, classify_file_type(".png"))

    assert csv_matrix == 6
    assert pdf_matrix == 16
    assert xls_matrix == 12
    assert png_matrix == 24

    assert csv_r == 3.99
    assert pdf_r == 3.923
    assert xls_r == 3.96
    assert png_r == 3.9


def test_select_r_entropy_bands():
    assert select_r(3.9) == 3.99
    assert select_r(5.2) == 3.96
    assert select_r(6.4) == 3.923
    assert select_r(7.8) == 3.9
