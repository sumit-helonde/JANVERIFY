"""Vercel serverless entrypoint for the JANVERIFY FastAPI backend.

Vercel rewrites every /api/* request to this function, so the original path is
restored before FastAPI routes it. The app is exported as a real FastAPI
instance so the Vercel Python runtime can detect the framework.
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

from starlette.types import ASGIApp, Receive, Scope, Send  # noqa: E402

from app.main import app  # noqa: E402

_ORIGINAL_PATH_HEADERS = (
    b"x-vercel-original-path",
    b"x-vercel-original-url",
    b"x-original-url",
    b"x-forwarded-uri",
    b"x-rewrite-url",
)
_REWRITE_TARGETS = ("/api/index", "/api/index.py", "/api")


class OriginalPathMiddleware:
    """Restores the pre-rewrite request path so FastAPI route matching works."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope.get("type") == "http" and scope.get("path") in _REWRITE_TARGETS:
            original = _original_path(scope)
            if original:
                scope = dict(scope)
                scope["path"] = original
                raw = scope.get("raw_path")
                scope["raw_path"] = original.encode() if isinstance(raw, bytes) else raw
        await self.app(scope, receive, send)


def _original_path(scope: Scope) -> str | None:
    headers = scope.get("headers") or []
    for name in _ORIGINAL_PATH_HEADERS:
        value = next((v for k, v in headers if k.lower() == name), None)
        if not value:
            continue
        text = value.decode("latin-1")
        path = text.split("://", 1)[-1].split("/", 1)[-1] if "://" in text else text
        path = path.split("?", 1)[0]
        if path.startswith("/api/"):
            return path
    return None


app.add_middleware(OriginalPathMiddleware)
