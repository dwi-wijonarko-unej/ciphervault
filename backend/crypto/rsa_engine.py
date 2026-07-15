from __future__ import annotations

from pathlib import Path

from Crypto.Cipher import PKCS1_OAEP
from Crypto.Hash import SHA256
from Crypto.PublicKey import RSA

from backend.config import get_settings

settings = get_settings()


def generate_keys(
    key_size: int | None = None,
    private_key_path: str | None = None,
    public_key_path: str | None = None,
) -> tuple[bytes, bytes]:
    rsa_key_size = key_size or settings.rsa_key_size
    private_path = Path(private_key_path or settings.rsa_private_key_path)
    public_path = Path(public_key_path or settings.rsa_public_key_path)

    private_path.parent.mkdir(parents=True, exist_ok=True)
    public_path.parent.mkdir(parents=True, exist_ok=True)

    key = RSA.generate(rsa_key_size)
    private_key = key.export_key()
    public_key = key.publickey().export_key()

    private_path.write_bytes(private_key)
    public_path.write_bytes(public_key)

    return private_key, public_key


def load_or_create_global_keypair() -> tuple[bytes, bytes]:
    private_path = Path(settings.rsa_private_key_path)
    public_path = Path(settings.rsa_public_key_path)

    if not private_path.exists() or not public_path.exists():
        return generate_keys()

    return private_path.read_bytes(), public_path.read_bytes()


def _get_public_key(
    public_key: bytes | None = None, public_key_path: str | None = None
) -> RSA.RsaKey:
    if public_key is not None:
        return RSA.import_key(public_key)

    path = Path(public_key_path or settings.rsa_public_key_path)
    if not path.exists():
        _, generated_public = generate_keys()
        return RSA.import_key(generated_public)

    return RSA.import_key(path.read_bytes())


def _get_private_key(
    private_key: bytes | None = None, private_key_path: str | None = None
) -> RSA.RsaKey:
    if private_key is not None:
        return RSA.import_key(private_key)

    path = Path(private_key_path or settings.rsa_private_key_path)
    if not path.exists():
        generated_private, _ = generate_keys()
        return RSA.import_key(generated_private)

    return RSA.import_key(path.read_bytes())


def rsa_encrypt(
    data: bytes, public_key: bytes | None = None, public_key_path: str | None = None
) -> bytes:
    key = _get_public_key(public_key, public_key_path)
    cipher = PKCS1_OAEP.new(key, hashAlgo=SHA256)
    chunk_size = key.size_in_bytes() - (2 * SHA256.digest_size) - 2

    encrypted_chunks: list[bytes] = []
    for i in range(0, len(data), chunk_size):
        encrypted_chunks.append(cipher.encrypt(data[i : i + chunk_size]))

    return b"".join(encrypted_chunks)


def rsa_decrypt(
    ciphertext: bytes,
    private_key: bytes | None = None,
    private_key_path: str | None = None,
) -> bytes:
    key = _get_private_key(private_key, private_key_path)
    cipher = PKCS1_OAEP.new(key, hashAlgo=SHA256)
    chunk_size = key.size_in_bytes()

    if len(ciphertext) % chunk_size != 0:
        raise ValueError("Invalid RSA ciphertext length")

    decrypted_chunks: list[bytes] = []
    for i in range(0, len(ciphertext), chunk_size):
        decrypted_chunks.append(cipher.decrypt(ciphertext[i : i + chunk_size]))

    return b"".join(decrypted_chunks)
