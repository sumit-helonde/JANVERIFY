from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["health"])


class HealthResponse(BaseModel):
    status: str
    service: str


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Real health endpoint. Exact response: {"status":"ok","service":"janverify-api"}."""
    return HealthResponse(status="ok", service="janverify-api")


@router.get("/health/db", tags=["health"])
async def health_db() -> dict:
    """Reports whether the configured database is reachable and schema-loaded."""
    from app.api.routes._db import T
    from app.core.db import check_database_connection

    try:
        detail = check_database_connection()
    except Exception as exc:
        return {"ok": False, "error": str(exc)[:300], "tables": len(T)}
    return {"ok": True, "database": detail, "tables": len(T)}
