from collections import defaultdict, deque
from threading import Lock
from time import time

from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        default_limit: int,
        window_seconds: int,
        auth_limit: int,
    ):
        super().__init__(app)
        self.default_limit = default_limit
        self.window_seconds = window_seconds
        self.auth_limit = auth_limit
        self._requests = defaultdict(deque)
        self._lock = Lock()
        self._skip_paths = {
            "/",
            "/health",
            "/api/health",
            "/docs",
            "/openapi.json",
            "/redoc",
        }

    def _resolve_bucket(self, path: str) -> tuple[str, int]:
        if path.startswith("/api/auth"):
            return "auth", self.auth_limit
        return "default", self.default_limit

    @staticmethod
    def _build_headers(limit: int, remaining: int, reset_in: int) -> dict[str, str]:
        return {
            "X-RateLimit-Limit": str(limit),
            "X-RateLimit-Remaining": str(max(remaining, 0)),
            "X-RateLimit-Reset": str(max(reset_in, 0)),
        }

    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS" or request.url.path in self._skip_paths:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        bucket, limit = self._resolve_bucket(request.url.path)
        now = time()
        key = f"{bucket}:{client_ip}"

        with self._lock:
            timestamps = self._requests[key]
            while timestamps and now - timestamps[0] >= self.window_seconds:
                timestamps.popleft()

            if len(timestamps) >= limit:
                retry_after = int(self.window_seconds - (now - timestamps[0])) if timestamps else self.window_seconds
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please retry later."},
                    headers={
                        **self._build_headers(limit, 0, retry_after),
                        "Retry-After": str(max(retry_after, 1)),
                    },
                )

            timestamps.append(now)
            remaining = limit - len(timestamps)
            reset_in = int(self.window_seconds - (now - timestamps[0])) if timestamps else self.window_seconds

        response = await call_next(request)
        for header_name, header_value in self._build_headers(limit, remaining, reset_in).items():
            response.headers.setdefault(header_name, header_value)
        return response
