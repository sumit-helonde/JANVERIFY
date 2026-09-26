import logging

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings

logger = logging.getLogger("janverify.db")

settings = get_settings()

engine = create_engine(settings.database_url, pool_pre_ping=True)
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