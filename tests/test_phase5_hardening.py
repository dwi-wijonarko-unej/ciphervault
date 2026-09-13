from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

from backend.main import app
from backend.middleware.rate_limit import RateLimitMiddleware
from backend.middleware.security_headers import SecurityHeadersMiddleware

client = TestClient(app)


def _limited_app() -> TestClient:
    limited = FastAPI()
    limited.add_middleware(RateLimitMiddleware, enabled=True)

    @limited.post("/auth/login")
    def fake_login():
        return JSONResponse({"ok": True})

    return TestClient(limited)


def test_security_headers_present():
    response = client.get("/health/live")
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert "max-age=31536000" in response.headers["Strict-Transport-Security"]
    assert "frame-ancestors 'none'" in response.headers["Content-Security-Policy"]


def test_login_rate_limit_blocks_after_threshold():
    limited = _limited_app()
    for _ in range(5):
        assert limited.post("/auth/login").status_code == 200
    response = limited.post("/auth/login")
    assert response.status_code == 429
    assert "Too many requests" in response.json()["detail"]


def test_rate_limit_middleware_disabled():
    middleware = RateLimitMiddleware(app=None, enabled=False)
    assert middleware.enabled is False
