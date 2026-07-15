from backend.crypto.security_analyzer import analyze_file


def test_analyze_file_returns_score_and_metrics():
    payload = b"A" * 4096

    result = analyze_file(payload)

    assert "score" in result
    assert "metrics" in result
    assert isinstance(result["score"], int)
    assert 0 <= result["score"] <= 100


def test_analyze_file_includes_expected_metric_keys():
    payload = bytes(range(256)) * 8

    result = analyze_file(payload)
    metrics = result["metrics"]

    expected = {
        "entropy",
        "correlation",
        "avalanche",
        "chi_square",
        "npcr",
        "uaci",
        "bit_change",
        "mutual_information",
        "compression_ratio",
    }
    assert expected.issubset(metrics.keys())


def test_entropy_for_non_uniform_data_is_lowish():
    payload = b"\x00" * 2048

    result = analyze_file(payload)

    assert result["metrics"]["entropy"] < 1.0


def test_entropy_for_uniform_distribution_is_higher():
    payload = bytes(range(256)) * 16

    result = analyze_file(payload)

    assert result["metrics"]["entropy"] > 7.0


def test_avalanche_and_npcr_are_bounded():
    payload = b"ciphervault-phase2" * 200

    result = analyze_file(payload)

    assert 0 <= result["metrics"]["avalanche"] <= 100
    assert 0 <= result["metrics"]["npcr"] <= 100
