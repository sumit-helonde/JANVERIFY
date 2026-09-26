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