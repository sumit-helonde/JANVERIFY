import pytest
from sqlalchemy import create_engine, text

from app.config import get_settings

pytestmark = pytest.mark.db


def _connection_ok(engine) -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


def test_database_connection():
    """Verify a real PostgreSQL database connection via SQLAlchemy.

    Uses DATABASE_URL from the app settings (backend/.env). Skipped when the
    database is not reachable so the suite stays usable without a server.
    """
    settings = get_settings()
    engine = create_engine(settings.database_url, pool_pre_ping=True)
    try:
        if not _connection_ok(engine):
            pytest.skip(f"Database not reachable at {settings.database_url}")
        from app.core.db import check_database_connection

        info = check_database_connection()
    finally:
        engine.dispose()

    assert " as " in info
    assert "PostgreSQL" in info


def test_postgis_available():
    """PostGIS must be available on the target server (used from Phase 3)."""
    settings = get_settings()
    engine = create_engine(settings.database_url, pool_pre_ping=True)
    try:
        if not _connection_ok(engine):
            pytest.skip(f"Database not reachable at {settings.database_url}")
        with engine.connect() as conn:
            rows = conn.execute(
                text(
                    "SELECT 1 FROM pg_available_extensions "
                    "WHERE name = 'postgis'"
                )
            ).fetchall()
    finally:
        engine.dispose()

    assert rows, "postgis extension is not available on the server"