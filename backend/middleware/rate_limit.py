import time
from collections import defaultdict, deque

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from backend.config import get_settings

settings = get_settings()


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, enabled: bool = True) -> None:
        super().__init__(app)
        self.enabled = enabled
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def _rule(self, path: str, method: str) -> tuple[int, int] | None:
        if method == "POST" and path.rstrip("/").endswith("/auth/login"):
            return settings.login_rate_limit, settings.login_rate_window_seconds
        if method == "POST" and "/upload" in path:
            return settings.upload_rate_limit, settings.upload_rate_window_seconds
        return None

    async def dispatch(self, request: Request, call_next):
        if self.enabled:
            rule = self._rule(request.url.path, request.method)
            if rule:
                limit, window = rule
                client = request.client.host if request.client else "unknown"
                key = f"{client}:{request.url.path}"
                now = time.monotonic()
                hits = self._hits[key]
                while hits and now - hits[0] > window:
                    hits.popleft()
                if len(hits) >= limit:
                    return JSONResponse(
                        status_code=429,
                        content={"detail": "Too many requests, please try again later"},
                    )
                hits.append(now)
        return await call_next(request)
