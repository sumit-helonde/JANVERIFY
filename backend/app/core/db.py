import logging

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings

logger = logging.getLogger("janverify.db")

settings = get_settings()

# create_engine parses the URL eagerly, so a missing/invalid DATABASE_URL would
# crash the whole process on boot. Fall back to the local default and let the
# routes surface a clear database error instead.
try:
    engine = create_engine(settings.database_url, pool_pre_ping=True)
except Exception as exc:  # pragma: no cover - only when the URL is unusable
    logger.warning("invalid database_url (%s); falling back to local default", exc)
    engine = create_engine(
        "postgresql+psycopg://janverify:janverify_dev_password@localhost:5432/janverify",
        pool_pre_ping=True,
    )

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_session():
    """FastAPI dependency providing a database session."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> str:
    """Open a real connection and report the connected database and user."""
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT current_database(), current_user, version()")
        )
        row = result.one()
    return f"{row[0]} as {row[1]} on {row[2]}"