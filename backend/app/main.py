from contextlib import asynccontextmanager
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import health
from app.api.routes.projects import router as projects_router
from app.api.routes.contractors import router as contractors_router
from app.api.routes.contractors import trender as tenders_router
from app.api.routes.compare import router as compare_router
from app.api.routes.submissions import router as submissions_router
from app.api.routes.auth import router as auth_router
from app.api.routes.admin import router as admin_router
from app.api.routes.civicwatch import router as civicwatch_router
from app.api.routes.civicwatch import uploads_router as civic_uploads_router
from app.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import get_logger

settings = get_settings()
logger = get_logger("janverify")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "JANVERIFY API starting (env=%s, log_level=%s)",
        settings.environment,
        settings.log_level,
    )
    yield
    logger.info("JANVERIFY API shutting down")


app = FastAPI(
    title="JANVERIFY API",
    description="Your Tax. Your Evidence. Your Right to Know.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(projects_router)
app.include_router(contractors_router)
app.include_router(tenders_router)
app.include_router(compare_router)
app.include_router(submissions_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(civicwatch_router)
app.include_router(civic_uploads_router)

register_exception_handlers(app)

# Citizen-submitted CivicWatch photos (written by the report-issue endpoint).
# On Vercel the filesystem is read-only/ephemeral, so photos go to Vercel Blob
# and the static mounts are skipped.
uploads_ready = False
if not os.environ.get("BLOB_READ_WRITE_TOKEN", "").strip():
    UPLOADS_DIR = Path(__file__).resolve().parents[1] / "uploads"
    try:
        UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        uploads_ready = True
    except OSError as exc:  # read-only filesystem (e.g. Vercel without Blob)
        logger.warning("uploads directory unavailable (%s); photo uploads require BLOB_READ_WRITE_TOKEN", exc)
    if uploads_ready:
        app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
        # Same directory under the API prefix so the dev proxy serves photos unchanged.
        app.mount("/api/uploads", StaticFiles(directory=UPLOADS_DIR), name="api_uploads")

# Serve the built React app from the same origin when a build output exists, so
# a single server hosts the whole product (API + UI). On Vercel the build copies
# the output into api/static so it ships inside the function bundle.
_FRONTEND_DIST_CANDIDATES = (
    Path(__file__).resolve().parents[2] / "api" / "static",   # Vercel function bundle
    Path(__file__).resolve().parents[2] / "frontend" / "dist",  # local build
)
FRONTEND_DIST = next((p for p in _FRONTEND_DIST_CANDIDATES if p.is_dir()), None)
if FRONTEND_DIST is not None:
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path == "api":
            raise HTTPException(status_code=404, detail="Not Found")
        if full_path:
            candidate = (FRONTEND_DIST / full_path).resolve()
            try:
                candidate.relative_to(FRONTEND_DIST.resolve())
            except ValueError:
                raise HTTPException(status_code=404, detail="Not Found")
            if candidate.is_file():
                return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")