"""Vercel serverless entrypoint for the JANVERIFY FastAPI backend.

Vercel rewrites every /api/* request to this function, so the original path has to
be restored before FastAPI routes it. The original URL is read from the headers
Vercel/proxies set, falling back to the ASGI scope path.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

os.environ.setdefault("ENVIRONMENT", "production")

from app.main import app as fastapi_app  # noqa: E402

_ORIGINAL_PATH_HEADERS = (
    b"x-vercel-original-path",
    b"x-vercel-original-url",
    b"x-original-url",
    b"x-forwarded-uri",
    b"x-rewrite-url",
)


def _original_path(scope: dict) -> str | None:
    for name in _ORIGINAL_PATH_HEADERS:
        value = None
        for key, header_value in scope.get("headers", []):
            if key.lower() == name:
                value = header_value
                break
        if not value:
            continue
        text = value.decode("latin-1")
        path = text.split("://", 1)[-1].split("/", 1)[-1] if "://" in text else text
        path = path.split("?", 1)[0]
        if path.startswith("/api/"):
            return path
    return None


class OriginalPathMiddleware:
    """Restores the pre-rewrite request path so FastAPI route matching works."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope.get("type") == "http":
            original = _original_path(scope)
            if original and scope.get("path") in ("/api/index", "/api/index.py", "/api"):
                scope = dict(scope)
                scope["path"] = original
                raw = scope.get("raw_path")
                if raw:
                    scope["raw_path"] = original.encode()
        await self.app(scope, receive, send)


app = OriginalPathMiddleware(fastapi_app)
