from backend.crypto.integrity import verify_integrity
from backend.crypto.metadata_generator import compute_sha256


def test_verify_integrity_true_when_hash_matches():
    data = b"hello ciphervault"
    assert verify_integrity(data, compute_sha256(data))


def test_verify_integrity_false_when_hash_mismatch():
    data = b"hello ciphervault"
    assert not verify_integrity(data, compute_sha256(b"different"))


def test_compute_sha256_is_deterministic():
    data = b"deterministic"
    h1 = compute_sha256(data)
    h2 = compute_sha256(data)
    assert h1 == h2
