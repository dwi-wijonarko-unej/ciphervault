import os

import pytest

from backend.crypto.aes_engine import aes_decrypt, aes_encrypt


def test_aes_roundtrip_with_32_byte_key():
    data = os.urandom(2048)
    key = os.urandom(32)

    ciphertext, iv = aes_encrypt(data, key)
    restored = aes_decrypt(ciphertext, key, iv)

    assert restored == data


def test_aes_deterministic_with_same_iv_and_key():
    data = b"cipher-vault"
    key = b"k" * 32
    iv = b"i" * 16

    c1, _ = aes_encrypt(data, key, iv=iv)
    c2, _ = aes_encrypt(data, key, iv=iv)

    assert c1 == c2


def test_aes_differs_with_different_iv():
    data = b"cipher-vault"
    key = b"k" * 32

    c1, _ = aes_encrypt(data, key, iv=b"a" * 16)
    c2, _ = aes_encrypt(data, key, iv=b"b" * 16)

    assert c1 != c2


def test_aes_supports_non_standard_key_size_via_hash_normalization():
    data = b"sample"
    key = b"short-key"

    ciphertext, iv = aes_encrypt(data, key)
    restored = aes_decrypt(ciphertext, key, iv)

    assert restored == data


def test_aes_decrypt_invalid_padding_raises():
    data = b"sample-data"
    key = os.urandom(32)

    ciphertext, iv = aes_encrypt(data, key)
    tampered = ciphertext[:-1] + bytes([ciphertext[-1] ^ 0xFF])

    with pytest.raises(ValueError):
        aes_decrypt(tampered, key, iv)
