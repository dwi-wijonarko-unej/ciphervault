import os

import numpy as np
import pytest

from backend.crypto.uhc_engine import (
    generate_key_matrix,
    matrix_mod_inverse,
    uhc_decrypt,
    uhc_encrypt,
)


@pytest.mark.parametrize("size", [1, 31, 1024, 100 * 1024, 1024 * 1024])
def test_uhc_roundtrip_mod257_various_sizes(size: int):
    data = os.urandom(size)
    key = generate_key_matrix(matrix_size=8, seed_source=b"seed-mod257", modulus=257)

    ciphertext, iv, metadata = uhc_encrypt(data, key, modulus=257)
    restored = uhc_decrypt(ciphertext, key, modulus=257, metadata=metadata)

    assert iv
    assert restored == data


@pytest.mark.parametrize("size", [1, 257, 8192])
def test_uhc_roundtrip_mod256_various_sizes(size: int):
    data = os.urandom(size)
    key = generate_key_matrix(matrix_size=8, seed_source=b"seed-mod256", modulus=256)

    ciphertext, _, metadata = uhc_encrypt(data, key, modulus=256)
    restored = uhc_decrypt(ciphertext, key, modulus=256, metadata=metadata)

    assert restored == data


@pytest.mark.parametrize("n", [4, 6, 8])
def test_matrix_inverse_exists_mod257(n: int):
    key = generate_key_matrix(
        matrix_size=n, seed_source=f"seed-{n}".encode(), modulus=257
    )
    inv = matrix_mod_inverse(key, modulus=257)

    ident = (key @ inv) % 257
    assert np.array_equal(ident, np.eye(n, dtype=np.int64))


def test_encrypt_mod257_packs_uint16_even_length():
    data = b"hello-world"
    key = generate_key_matrix(matrix_size=4, seed_source=b"seed", modulus=257)
    ciphertext, _, metadata = uhc_encrypt(data, key, modulus=257)

    assert len(ciphertext) % 2 == 0
    assert metadata["original_length"] == len(data)


def test_invalid_modulus_raises():
    key = generate_key_matrix(matrix_size=4, seed_source=b"seed", modulus=257)
    with pytest.raises(ValueError):
        uhc_encrypt(b"abc", key, modulus=251)
