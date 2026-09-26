"""Vercel serverless entrypoint for the JANVERIFY FastAPI backend.

Vercel routes every /api/* request to this function, so the original request
path is restored before FastAPI matches routes.

Import failures are reported as readable text (using only the standard library)
so a broken deployment reports its cause instead of an empty 500.
"""

from __future__ import annotations

import os
import sys
import traceback
from pathlib import Path

HERE = Path(__file__).resolve().parent

# The bundle layout differs between local runs and the Vercel function bundle,
# so locate the directory that contains the FastAPI package (the one holding
# app/main.py).
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


class _TextErrorApp:
    """Minimal ASGI app that reports a startup failure as plain text."""

    status = 500

    def __init__(self, message: str) -> None:
        self._body = message.encode()

    async def __call__(self, scope, receive, send) -> None:
        if scope.get("type") == "lifespan":
            while True:
                message = await receive()
                if message["type"] == "lifespan.startup":
                    await send({"type": "lifespan.startup.complete"})
                elif message["type"] == "lifespan.shutdown":
                    await send({"type": "lifespan.shutdown.complete"})
                    return
        await send(
            {
                "type": "http.response.start",
                "status": self.status,
                "headers": [(b"content-type", b"text/plain; charset=utf-8")],
            }
        )
        await send({"type": "http.response.body", "body": self._body})


# Top-level binding so the Vercel Python builder detects the ASGI app.
app = None

try:
    from starlette.types import ASGIApp, Receive, Scope, Send  # noqa: F401

    from app.main import app  # noqa: F401,E402
except Exception:  # pragma: no cover - surfaced as readable text on Vercel
    app = _TextErrorApp("IMPORT FAILED\n\n" + traceback.format_exc())


if app is not None and not isinstance(app, _TextErrorApp):
    _ORIGINAL_PATH_HEADERS = (
        b"x-vercel-original-path",
        b"x-vercel-original-url",
        b"x-original-url",
        b"x-forwarded-uri",
        b"x-rewrite-url",
    )
    _REWRITE_TARGETS = ("/api/index", "/api/index.py", "/api")

    def _original_path(scope) -> str | None:
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

    class OriginalPathMiddleware:
        """Restores the pre-rewrite request path so FastAPI route matching works."""

        def __init__(self, inner) -> None:
            self.inner = inner

        async def __call__(self, scope, receive, send) -> None:
            if scope.get("type") == "http" and scope.get("path") in _REWRITE_TARGETS:
                original = _original_path(scope)
                if original:
                    scope = dict(scope)
                    scope["path"] = original
                    raw = scope.get("raw_path")
                    scope["raw_path"] = original.encode() if isinstance(raw, bytes) else raw
            await self.inner(scope, receive, send)

    app.add_middleware(OriginalPathMiddleware)
