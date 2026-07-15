from pathlib import Path

from backend.crypto.rsa_engine import (
    generate_keys,
    load_or_create_global_keypair,
    rsa_decrypt,
    rsa_encrypt,
    settings,
)


def test_generate_keys_creates_files(tmp_path: Path):
    private_path = tmp_path / "private.pem"
    public_path = tmp_path / "public.pem"

    private_key, public_key = generate_keys(
        key_size=1024,
        private_key_path=str(private_path),
        public_key_path=str(public_path),
    )

    assert private_key
    assert public_key
    assert private_path.exists()
    assert public_path.exists()


def test_rsa_roundtrip_short_payload(tmp_path: Path):
    private_path = tmp_path / "private.pem"
    public_path = tmp_path / "public.pem"

    private_key, public_key = generate_keys(
        key_size=1024,
        private_key_path=str(private_path),
        public_key_path=str(public_path),
    )

    plaintext = b"hello-ciphervault"
    encrypted = rsa_encrypt(plaintext, public_key=public_key)
    restored = rsa_decrypt(encrypted, private_key=private_key)

    assert restored == plaintext


def test_rsa_roundtrip_chunked_payload(tmp_path: Path):
    private_path = tmp_path / "private.pem"
    public_path = tmp_path / "public.pem"

    private_key, public_key = generate_keys(
        key_size=1024,
        private_key_path=str(private_path),
        public_key_path=str(public_path),
    )

    plaintext = b"A" * 2048
    encrypted = rsa_encrypt(plaintext, public_key=public_key)
    restored = rsa_decrypt(encrypted, private_key=private_key)

    assert restored == plaintext


def test_load_or_create_global_keypair_generates_when_missing(tmp_path: Path):
    original_private = settings.rsa_private_key_path
    original_public = settings.rsa_public_key_path

    settings.rsa_private_key_path = str(tmp_path / "global_private.pem")
    settings.rsa_public_key_path = str(tmp_path / "global_public.pem")

    try:
        private_key, public_key = load_or_create_global_keypair()
        assert private_key
        assert public_key
        assert Path(settings.rsa_private_key_path).exists()
        assert Path(settings.rsa_public_key_path).exists()
    finally:
        settings.rsa_private_key_path = original_private
        settings.rsa_public_key_path = original_public
