from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

register_exception_handlers(app)

# Citizen-submitted CivicWatch photos (written by the report-issue endpoint).
UPLOADS_DIR = Path(__file__).resolve().parents[1] / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
# Same directory under the API prefix so the dev proxy serves photos unchanged.
app.mount("/api/uploads", StaticFiles(directory=UPLOADS_DIR), name="api_uploads")