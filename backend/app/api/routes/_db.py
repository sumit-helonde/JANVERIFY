"""Shared reflected-schema DB access for the FastAPI routes.

The Phase 3 ORM relationship layer cannot be configured, so routes use the
reflected live schema (SQLAlchemy Core) exactly like the Phase 4 seeder. All
queries run against the same engine the app serves.
"""

from sqlalchemy import MetaData

from app.core.db import engine

metadata = MetaData()
metadata.reflect(bind=engine)
T = metadata.tables