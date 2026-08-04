"""Tests for RBAC, API Keys, Public Links, and Admin panel (v6.0)."""

import io
import uuid

from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def _uid(prefix="u"):
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _register_and_login(password: str = "Pass123!"):
    """Register a unique user and return (username, token, user_dict)."""
    username = _uid()
    r = client.post(
        "/auth/register",
        json={
            "username": username,
            "email": f"{username}@test.io",
            "password": password,
        },
    )
    assert r.status_code == 200, r.text
    r = client.post(
        "/auth/login",
        json={"username": username, "password": password},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    return username, data["access_token"], data["user"]


def _upload(token, filename, content):
    return client.post(
        "/files/upload",
        files={"file": (filename, io.BytesIO(content), "application/octet-stream")},
        headers={"Authorization": f"Bearer {token}"},
    )


def _make_admin(user_id):
    from backend.database import SessionLocal
    from backend.models import User

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        user.role = "admin"
        db.commit()
    finally:
        db.close()


# ── RBAC Tests ──────────────────────────────────────────────────


class TestRBAC:
    def test_new_user_gets_user_role(self):
        _, _, user = _register_and_login()
        assert user["role"] == "user"
        assert user["is_active"] is True

    def test_system_endpoints_forbidden_for_regular_user(self):
        _, token, _ = _register_and_login()
        auth = {"Authorization": f"Bearer {token}"}
        assert client.get("/system/config", headers=auth).status_code == 403
        assert client.get("/system/status", headers=auth).status_code == 403

    def test_analyze_endpoint_forbidden_for_regular_user(self):
        _, token, _ = _register_and_login()
        auth = {"Authorization": f"Bearer {token}"}
        up = _upload(token, "f.txt", b"data")
        file_id = up.json()["id"]
        assert client.post(f"/files/{file_id}/analyze", headers=auth).status_code == 403

    def test_admin_endpoints_forbidden_for_regular_user(self):
        _, token, _ = _register_and_login()
        auth = {"Authorization": f"Bearer {token}"}
        assert client.get("/admin/users", headers=auth).status_code == 403
        assert client.get("/admin/stats", headers=auth).status_code == 403


# ── API Key Tests ───────────────────────────────────────────────


class TestAPIKeys:
    def test_create_and_use_api_key(self):
        username, token, _ = _register_and_login()
        auth = {"Authorization": f"Bearer {token}"}

        r = client.post("/api-keys", json={"label": "my-key"}, headers=auth)
        assert r.status_code == 200
        raw_key = r.json()["key"]
        assert raw_key.startswith("cv_")

        r = client.get("/auth/me", headers={"X-API-Key": raw_key})
        assert r.status_code == 200
        assert r.json()["username"] == username

    def test_api_key_works_for_files(self):
        _, token, _ = _register_and_login()
        auth = {"Authorization": f"Bearer {token}"}

        r = client.post("/api-keys", json={"label": "k"}, headers=auth)
        raw_key = r.json()["key"]

        assert client.get("/files", headers={"X-API-Key": raw_key}).status_code == 200

    def test_list_keys_does_not_show_plaintext(self):
        _, token, _ = _register_and_login()
        auth = {"Authorization": f"Bearer {token}"}

        client.post("/api-keys", json={"label": "k1"}, headers=auth)
        r = client.get("/api-keys", headers=auth)
        assert r.status_code == 200
        for item in r.json()["keys"]:
            assert "key" not in item
            assert "key_prefix" in item

    def test_invalid_api_key_returns_401(self):
        r = client.get("/auth/me", headers={"X-API-Key": "cv_invalid"})
        assert r.status_code == 401

    def test_revoke_api_key(self):
        _, token, _ = _register_and_login()
        auth = {"Authorization": f"Bearer {token}"}

        r = client.post("/api-keys", json={"label": "k"}, headers=auth)
        key_id = r.json()["id"]
        raw_key = r.json()["key"]

        assert client.delete(f"/api-keys/{key_id}", headers=auth).status_code == 204
        assert client.get("/auth/me", headers={"X-API-Key": raw_key}).status_code == 401

    def test_no_auth_returns_401(self):
        assert client.get("/auth/me").status_code == 401

    def test_api_key_does_not_cross_users(self):
        user_a, token_a, _ = _register_and_login()
        user_b, _, _ = _register_and_login()

        r = client.post(
            "/api-keys",
            json={"label": "k"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        raw_key = r.json()["key"]

        r = client.get("/auth/me", headers={"X-API-Key": raw_key})
        assert r.json()["username"] == user_a
        assert r.json()["username"] != user_b


# ── Public Link Tests ───────────────────────────────────────────


class TestPublicLinks:
    def test_create_and_download_public_link(self):
        _, token, _ = _register_and_login()
        auth = {"Authorization": f"Bearer {token}"}
        content = b"public link content"

        up = _upload(token, "test.txt", content)
        file_id = up.json()["id"]

        r = client.post(f"/files/{file_id}/public-link", json={}, headers=auth)
        assert r.status_code == 200
        link = r.json()
        assert link["token"].startswith("pl_")
        assert link["has_password"] is False

        r = client.get(f"/public/{link['token']}")
        assert r.status_code == 200
        assert r.content == content

    def test_password_protected_link(self):
        _, token, _ = _register_and_login()
        auth = {"Authorization": f"Bearer {token}"}
        content = b"secret content"

        up = _upload(token, "secret.txt", content)
        file_id = up.json()["id"]

        r = client.post(
            f"/files/{file_id}/public-link",
            json={"password": "mypass"},
            headers=auth,
        )
        token_link = r.json()["token"]

        assert client.get(f"/public/{token_link}").status_code == 403
        assert client.get(f"/public/{token_link}?password=wrong").status_code == 403
        r = client.get(f"/public/{token_link}?password=mypass")
        assert r.status_code == 200
        assert r.content == content

    def test_max_access_limit(self):
        _, token, _ = _register_and_login()
        auth = {"Authorization": f"Bearer {token}"}
        up = _upload(token, "f.txt", b"data")
        file_id = up.json()["id"]

        r = client.post(
            f"/files/{file_id}/public-link",
            json={"max_access": 1},
            headers=auth,
        )
        token_link = r.json()["token"]

        assert client.get(f"/public/{token_link}").status_code == 200
        assert client.get(f"/public/{token_link}").status_code == 410

    def test_revoke_public_link(self):
        _, token, _ = _register_and_login()
        auth = {"Authorization": f"Bearer {token}"}
        up = _upload(token, "f.txt", b"data")
        file_id = up.json()["id"]

        r = client.post(f"/files/{file_id}/public-link", json={}, headers=auth)
        link_id = r.json()["id"]
        token_link = r.json()["token"]

        assert (
            client.delete(f"/public-links/{link_id}", headers=auth).status_code == 204
        )
        assert client.get(f"/public/{token_link}").status_code == 404

    def test_list_public_links(self):
        _, token, _ = _register_and_login()
        auth = {"Authorization": f"Bearer {token}"}
        up = _upload(token, "f.txt", b"data")
        file_id = up.json()["id"]

        client.post(f"/files/{file_id}/public-link", json={}, headers=auth)
        client.post(f"/files/{file_id}/public-link", json={}, headers=auth)

        r = client.get(f"/files/{file_id}/public-links", headers=auth)
        assert r.status_code == 200
        assert len(r.json()["links"]) == 2

    def test_cannot_create_link_for_others_file(self):
        _, token_a, _ = _register_and_login()
        _, token_b, _ = _register_and_login()

        up = _upload(token_a, "f.txt", b"data")
        file_id = up.json()["id"]

        r = client.post(
            f"/files/{file_id}/public-link",
            json={},
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert r.status_code == 404


# ── Admin Panel Tests ───────────────────────────────────────────


class TestAdminPanel:
    def _get_admin_token(self):
        _, token, user = _register_and_login()
        _make_admin(user["id"])
        return token

    def test_admin_can_list_users(self):
        token = self._get_admin_token()
        r = client.get("/admin/users", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert "items" in r.json()

    def test_admin_can_get_stats(self):
        token = self._get_admin_token()
        r = client.get("/admin/stats", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert "users" in r.json()

    def test_admin_can_update_role(self):
        token = self._get_admin_token()
        auth = {"Authorization": f"Bearer {token}"}
        _, _, target = _register_and_login()

        r = client.patch(
            f"/admin/users/{target['id']}/role",
            json={"role": "admin"},
            headers=auth,
        )
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_admin_can_deactivate_user(self):
        token = self._get_admin_token()
        auth = {"Authorization": f"Bearer {token}"}
        username, _, target = _register_and_login()

        r = client.patch(
            f"/admin/users/{target['id']}/active",
            json={"is_active": False},
            headers=auth,
        )
        assert r.status_code == 200
        assert r.json()["is_active"] is False

        # Can't login when deactivated
        r = client.post(
            "/auth/login",
            json={"username": username, "password": "Pass123!"},
        )
        assert r.status_code == 403

    def test_admin_can_reset_password(self):
        token = self._get_admin_token()
        auth = {"Authorization": f"Bearer {token}"}
        username, _, target = _register_and_login()

        r = client.post(
            f"/admin/users/{target['id']}/reset-password",
            json={"new_password": "NewPass456!"},
            headers=auth,
        )
        assert r.status_code == 200

        r = client.post(
            "/auth/login",
            json={"username": username, "password": "NewPass456!"},
        )
        assert r.status_code == 200

    def test_invalid_role_rejected(self):
        token = self._get_admin_token()
        auth = {"Authorization": f"Bearer {token}"}
        _, _, target = _register_and_login()

        r = client.patch(
            f"/admin/users/{target['id']}/role",
            json={"role": "superadmin"},
            headers=auth,
        )
        assert r.status_code == 422


# ── Directory Management Tests ─────────────────────────────────


class TestDirectoryManagement:
    def test_create_root_folder(self):
        _, token, _ = _register_and_login()
        auth = {"Authorization": f"Bearer {token}"}

        r = client.post(
            "/files/directories",
            json={"name": "MyDocuments"},
            headers=auth,
        )
        assert r.status_code == 200
        assert r.json()["is_directory"] is True
        assert r.json()["parent_id"] is None

    def test_create_subfolder(self):
        _, token, _ = _register_and_login()
        auth = {"Authorization": f"Bearer {token}"}

        r = client.post("/files/directories", json={"name": "Parent"}, headers=auth)
        parent_id = r.json()["id"]

        r = client.post(
            "/files/directories",
            json={"name": "Child", "parent_id": parent_id},
            headers=auth,
        )
        assert r.status_code == 200
        assert r.json()["parent_id"] == parent_id

    def test_list_directory_contents(self):
        _, token, _ = _register_and_login()
        auth = {"Authorization": f"Bearer {token}"}

        client.post("/files/directories", json={"name": "FolderA"}, headers=auth)
        client.post("/files/directories", json={"name": "FolderB"}, headers=auth)

        r = client.get("/files/directories", headers=auth)
        assert r.status_code == 200
        names = [i["name"] for i in r.json()["items"]]
        assert "FolderA" in names
        assert "FolderB" in names

    def test_breadcrumb_navigation(self):
        _, token, _ = _register_and_login()
        auth = {"Authorization": f"Bearer {token}"}

        r = client.post("/files/directories", json={"name": "L1"}, headers=auth)
        l1_id = r.json()["id"]
        r = client.post(
            "/files/directories",
            json={"name": "L2", "parent_id": l1_id},
            headers=auth,
        )
        l2_id = r.json()["id"]

        r = client.get(f"/files/directories?parent_id={l2_id}", headers=auth)
        path_names = [b["name"] for b in r.json()["current_path"]]
        assert path_names == ["L1", "L2"]

    def test_move_file_to_folder(self):
        _, token, _ = _register_and_login()
        auth = {"Authorization": f"Bearer {token}"}

        up = _upload(token, "test.txt", b"content")
        file_id = up.json()["id"]

        r = client.post("/files/directories", json={"name": "F"}, headers=auth)
        folder_id = r.json()["id"]

        r = client.patch(
            f"/files/{file_id}/move",
            json={"target_parent_id": folder_id},
            headers=auth,
        )
        assert r.status_code == 200

        # File should appear in folder
        r = client.get(f"/files/directories?parent_id={folder_id}", headers=auth)
        ids = [i["id"] for i in r.json()["items"]]
        assert file_id in ids

    def test_cannot_move_folder_into_itself(self):
        _, token, _ = _register_and_login()
        auth = {"Authorization": f"Bearer {token}"}

        r = client.post("/files/directories", json={"name": "F"}, headers=auth)
        folder_id = r.json()["id"]

        r = client.patch(
            f"/files/{folder_id}/move",
            json={"target_parent_id": folder_id},
            headers=auth,
        )
        assert r.status_code == 400

    def test_delete_folder_recursive(self):
        _, token, _ = _register_and_login()
        auth = {"Authorization": f"Bearer {token}"}

        r = client.post("/files/directories", json={"name": "Parent"}, headers=auth)
        parent_id = r.json()["id"]

        up = _upload(token, "f.txt", b"data")
        file_id = up.json()["id"]
        client.patch(
            f"/files/{file_id}/move",
            json={"target_parent_id": parent_id},
            headers=auth,
        )

        r = client.delete(f"/files/directories/{parent_id}", headers=auth)
        assert r.status_code == 200

    def test_duplicate_folder_name_conflict(self):
        _, token, _ = _register_and_login()
        auth = {"Authorization": f"Bearer {token}"}

        client.post("/files/directories", json={"name": "SameName"}, headers=auth)
        r = client.post("/files/directories", json={"name": "SameName"}, headers=auth)
        assert r.status_code == 409


# ── Verify Integrity Tests ──────────────────────────────────────


class TestVerifyIntegrity:
    def test_verify_passes(self):
        _, token, _ = _register_and_login()
        auth = {"Authorization": f"Bearer {token}"}

        up = _upload(token, "f.txt", b"verify me")
        file_id = up.json()["id"]

        r = client.post(f"/files/{file_id}/verify", headers=auth)
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_verify_nonexistent_file(self):
        _, token, _ = _register_and_login()
        auth = {"Authorization": f"Bearer {token}"}

        r = client.post("/files/99999/verify", headers=auth)
        assert r.status_code == 404


# ── Download Ciphertext Tests ───────────────────────────────────


class TestDownloadCiphertext:
    def test_download_cipher(self):
        _, token, _ = _register_and_login()
        auth = {"Authorization": f"Bearer {token}"}

        plaintext = b"this is secret plaintext data"
        up = _upload(token, "secret.bin", plaintext)
        file_id = up.json()["id"]

        r = client.get(f"/files/{file_id}/download/cipher", headers=auth)
        assert r.status_code == 200
        assert r.content != plaintext  # ciphertext should differ

    def test_download_cipher_nonexistent(self):
        _, token, _ = _register_and_login()
        auth = {"Authorization": f"Bearer {token}"}

        r = client.get("/files/99999/download/cipher", headers=auth)
        assert r.status_code == 404


# ── Admin Security Stats Tests ──────────────────────────────────


class TestAdminSecurityStats:
    def _get_admin_token(self):
        _, token, user = _register_and_login()
        _make_admin(user["id"])
        return token

    def test_security_stats_admin_only(self):
        _, token, _ = _register_and_login()
        r = client.get(
            "/admin/security/stats",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 403

    def test_security_stats_returns_data(self):
        token = self._get_admin_token()
        auth = {"Authorization": f"Bearer {token}"}

        r = client.get("/admin/security/stats", headers=auth)
        assert r.status_code == 200
        data = r.json()
        assert "files_analyzed" in data
        assert "average_score" in data
        assert "average_entropy" in data
