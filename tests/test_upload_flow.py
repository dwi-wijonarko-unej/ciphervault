from __future__ import annotations

from uuid import uuid4

from fastapi.testclient import TestClient

from backend.database import SessionLocal
from backend.main import app
from backend.models import FileKey, StoredFile
from backend.storage import storage


def _register_and_login(client: TestClient, prefix: str) -> tuple[str, int]:
    username = f"{prefix}_{uuid4().hex[:8]}"
    password = "Passw0rd!"
    email = f"{username}@example.test"

    register_res = client.post(
        "/auth/register",
        json={"username": username, "email": email, "password": password},
    )
    assert register_res.status_code == 200

    login_res = client.post(
        "/auth/login", json={"username": username, "password": password}
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    user_id = login_res.json()["user"]["id"]
    return token, user_id


def _upload(client: TestClient, token: str, name: str, content: bytes):
    return client.post(
        "/files/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": (name, content, "text/plain")},
    )


def test_upload_requires_authentication():
    with TestClient(app) as client:
        res = client.post(
            "/files/upload",
            files={"file": ("a.txt", b"hello", "text/plain")},
        )

    assert res.status_code == 401


def test_upload_stores_ciphertext_and_metadata():
    plaintext = b"Hello CipherVault Phase 2"

    with TestClient(app) as client:
        token, user_id = _register_and_login(client, "upmeta")
        res = _upload(client, token, "phase2.txt", plaintext)

    assert res.status_code == 200
    body = res.json()
    assert body["security_score"] >= 0

    db = SessionLocal()
    try:
        stored = db.query(StoredFile).filter(StoredFile.id == body["id"]).first()
        assert stored is not None
        assert stored.owner_id == user_id

        assert storage.exists(stored.filename_stored)
        ciphertext = storage.read(stored.filename_stored)
        assert ciphertext != plaintext
        assert plaintext not in ciphertext

        key = db.query(FileKey).filter(FileKey.file_id == stored.id).first()
        assert key is not None
        assert '"ai_mode":"adaptive_split"' in key.metadata_json
        assert '"split_ratio":' in key.metadata_json
        assert '"matrix_size":' in key.metadata_json
        assert '"modulus":' in key.metadata_json
        assert '"logistic_r":' in key.metadata_json
    finally:
        db.close()


def test_double_upload_same_plaintext_produces_different_ciphertext():
    plaintext = b"same payload for iv randomness"

    with TestClient(app) as client:
        token, _ = _register_and_login(client, "updouble")
        r1 = _upload(client, token, "dup.txt", plaintext)
        r2 = _upload(client, token, "dup.txt", plaintext)

    assert r1.status_code == 200
    assert r2.status_code == 200

    db = SessionLocal()
    try:
        f1 = db.query(StoredFile).filter(StoredFile.id == r1.json()["id"]).first()
        f2 = db.query(StoredFile).filter(StoredFile.id == r2.json()["id"]).first()
        assert f1 and f2
        c1 = storage.read(f1.filename_stored)
        c2 = storage.read(f2.filename_stored)
        assert c1 != c2
    finally:
        db.close()


def test_wrapped_keys_do_not_store_session_key_plaintext():
    plaintext = b"key wrapping safety test"

    with TestClient(app) as client:
        token, _ = _register_and_login(client, "upwrap")
        res = _upload(client, token, "keys.txt", plaintext)

    assert res.status_code == 200
    file_id = res.json()["id"]

    db = SessionLocal()
    try:
        key = db.query(FileKey).filter(FileKey.file_id == file_id).first()
        assert key is not None

        stored_concat = "|".join(
            [
                key.wrapped_session_key,
                key.rsa_wrapped_session_key,
                key.iv_aes,
                key.iv_uhc,
                key.metadata_json,
            ]
        )
        assert len(key.wrapped_session_key) > 32
        assert len(key.rsa_wrapped_session_key) > 64
        assert "session_key" not in stored_concat.lower()
    finally:
        db.close()


def test_files_listing_is_user_scoped_and_system_endpoints_available():
    with TestClient(app) as client:
        token_a, _ = _register_and_login(client, "uplista")
        token_b, _ = _register_and_login(client, "uplistb")

        up = _upload(client, token_a, "owned.txt", b"owned-by-a")
        assert up.status_code == 200

        list_a = client.get("/files", headers={"Authorization": f"Bearer {token_a}"})
        list_b = client.get("/files", headers={"Authorization": f"Bearer {token_b}"})

        assert list_a.status_code == 200
        assert list_b.status_code == 200

        ids_a = {item["id"] for item in list_a.json()["items"]}
        ids_b = {item["id"] for item in list_b.json()["items"]}

        assert up.json()["id"] in ids_a
        assert up.json()["id"] not in ids_b

        cfg = client.get(
            "/system/config", headers={"Authorization": f"Bearer {token_a}"}
        )
        stat = client.get(
            "/system/status", headers={"Authorization": f"Bearer {token_a}"}
        )
        assert cfg.status_code == 200
        assert stat.status_code == 200
        assert "uhc_modulus" in cfg.json()
        assert "rsa_status" in stat.json()
