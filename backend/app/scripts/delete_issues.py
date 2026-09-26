"""Delete CivicWatch test issues (and their stored photos) by reference.

    python -m app.scripts.delete_issues CW-101 CW-102 ...
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[2]
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from sqlalchemy import delete, select, text  # noqa: E402

from app.core.db import SessionLocal  # noqa: E402
from app.api.routes._db import T  # noqa: E402


def main() -> int:
    refs = [a.strip().upper() for a in sys.argv[1:] if a.strip()]
    if not refs:
        refs = ["CW-101", "CW-102", "CW-103", "CW-104", "CW-105"]
    if os.environ.get("DATABASE_URL", "").startswith("postgres://"):
        os.environ["DATABASE_URL"] = os.environ["DATABASE_URL"].replace(
            "postgres://", "postgresql+psycopg://", 1
        )
    from app.core import db as db_module

    db_module.engine.dispose()
    db = SessionLocal()
    try:
        issues = T["civic_issues"]
        audit = T.get("audit_logs")
        for ref in refs:
            if audit is not None:
                db.execute(delete(audit).where(audit.c.entity_type == "civic_issue", audit.c.entity_id == ref))
            n = db.execute(delete(issues).where(issues.c.issue_reference == ref)).rowcount
            print(f"  deleted {ref}: issues={n}")
        uploads = T.get("civic_uploads")
        if uploads is not None:
            total = db.execute(text("select count(*) from civic_uploads")).scalar()
            removed = db.execute(delete(uploads)).rowcount
            print(f"  deleted stored photos: {removed} (had {total})")
        db.commit()
        left = [r for r in db.execute(select(issues.c.issue_reference)).scalars()]
        print("  remaining issues:", left)
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
