"""Shared reflected-schema DB access for the FastAPI routes.

The Phase 3 ORM relationship layer cannot be configured, so routes use the
reflected live schema (SQLAlchemy Core) exactly like the Phase 4 seeder. All
queries run against the same engine the app serves.
"""

import logging

from sqlalchemy import MetaData

from app.core.db import engine

logger = logging.getLogger("janverify.db")

metadata = MetaData()
try:
    metadata.reflect(bind=engine)
except Exception as exc:  # pragma: no cover - only when the DB is unreachable
    # Keep the process importable (e.g. a fresh deploy before DATABASE_URL is
    # set) so the API can report a clear error instead of failing to boot.
    logger.warning("schema reflection failed: %s", exc)
T = metadata.tables
