"""Vercel serverless entrypoint for the JANVERIFY FastAPI backend.

Vercel rewrites every /api/* request to this function, so the original path is
restored before FastAPI routes it. The app is exported as a real FastAPI
instance so the Vercel Python runtime can detect the framework.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

# The bundle layout differs between local runs, the Vercel build and the
# function bundle, so locate the directory that contains the FastAPI package.
_CANDIDATE_ROOTS = (
    HERE.parent / "backend",   # <repo>/api/index.py  +  <repo>/backend/app
    HERE / "backend",
    HERE.parent,               # backend/app flattened next to index.py
    HERE,
    Path.cwd() / "backend",
    Path.cwd(),
)


def _locate_backend() -> Path | None:
    for root in _CANDIDATE_ROOTS:
        try:
            if (root / "app" / "main.py").is_file():
                return root
        except OSError:
            continue
    return None


_backend = _locate_backend()
if _backend is not None and str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

os.environ.setdefault("ENVIRONMENT", "production")

from starlette.types import ASGIApp, Receive, Scope, Send  # noqa: E402

# Declared at the top level so the Vercel Python builder can statically detect
# the ASGI app, then replaced by the real application when the import succeeds.
app: ASGIApp | None = None
_import_error: str | None = None

try:
    from app.main import app  # noqa: E402
except Exception:  # pragma: no cover - surfaced as a readable 500 on Vercel
    import traceback

    _import_error = traceback.format_exc()

if app is None:  # pragma: no cover - only when the backend cannot be imported

    class _ImportErrorApp:
        """Reports why the API could not start instead of failing silently."""

        async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
            body = f"IMPORT FAILED\n\n{_import_error}".encode()
            await send(
                {
                    "type": "http.response.start",
                    "status": 500,
                    "headers": [(b"content-type", b"text/plain; charset=utf-8")],
                }
            )
            await send({"type": "http.response.body", "body": body})

    app = _ImportErrorApp()


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
