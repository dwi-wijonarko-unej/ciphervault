from __future__ import annotations

from uuid import uuid4

from fastapi.testclient import TestClient

from backend.main import app


def _unique_user() -> tuple[str, str, str]:
    suffix = uuid4().hex[:10]
    username = f"fe_{suffix}"
    email = f"{username}@example.test"
    password = "Passw0rd!"
    return username, email, password


def test_login_page_loads_auth_assets_and_guard_snippet() -> None:
    with TestClient(app) as client:
        res = client.get("/login.html")

    assert res.status_code == 200
    html = res.text

    assert "js/api.js" in html
    assert "js/ui.js" in html
    assert "js/auth.js" in html
    assert "Auth.redirectIfLoggedIn" in html


def test_dashboard_page_loads_stage1_scripts() -> None:
    with TestClient(app) as client:
        res = client.get("/index.html")

    assert res.status_code == 200
    html = res.text

    assert "js/api.js" in html
    assert "js/auth.js" in html
    assert "js/app.js" in html


def test_auth_flow_register_login_and_me_returns_user_from_jwt() -> None:
    username, email, password = _unique_user()

    with TestClient(app) as client:
        register_res = client.post(
            "/auth/register",
            json={"username": username, "email": email, "password": password},
        )
        assert register_res.status_code == 200
        assert register_res.json()["user"]["username"] == username

        login_res = client.post(
            "/auth/login", json={"username": username, "password": password}
        )
        assert login_res.status_code == 200
        login_payload = login_res.json()
        assert login_payload["token_type"] == "bearer"
        assert isinstance(login_payload.get("access_token"), str)
        assert login_payload["access_token"]

        me_res = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {login_payload['access_token']}"},
        )
        assert me_res.status_code == 200
        assert me_res.json()["username"] == username


def test_auth_me_is_protected_without_or_with_invalid_token() -> None:
    with TestClient(app) as client:
        no_token_res = client.get("/auth/me")
        assert no_token_res.status_code == 401

        invalid_token_res = client.get(
            "/auth/me", headers={"Authorization": "Bearer invalid.token.value"}
        )
        assert invalid_token_res.status_code == 401
        assert invalid_token_res.json()["detail"] == "Could not validate credentials"


def test_auth_js_contains_route_guard_for_stage1() -> None:
    with TestClient(app) as client:
        res = client.get("/js/auth.js")

    assert res.status_code == 200
    src = res.text

    assert "ensureAuthenticated" in src
    assert 'window.location.href = "login.html"' in src
    assert "redirectIfLoggedIn" in src
