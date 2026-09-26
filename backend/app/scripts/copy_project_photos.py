"""Copy project_photos from the local database into the hosted database.

Project ids differ between the two databases, so rows are matched by project
reference number instead of raw ids.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[2]
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

import psycopg  # noqa: E402
from sqlalchemy import text  # noqa: E402

LOCAL_ENV = BACKEND / ".env"


def local_url() -> str:
    for line in LOCAL_ENV.read_text(encoding="utf-8").splitlines():
        if line.strip().startswith("DATABASE_URL"):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("DATABASE_URL not found in backend/.env")


def main() -> int:
    hosted = os.environ["DATABASE_URL"]
    if hosted.startswith("postgres://"):
        hosted = "postgresql://" + hosted[len("postgres://") :]
    local = local_url()
    if local.startswith("postgresql+psycopg://"):
        local = "postgresql://" + local[len("postgresql+psycopg://") :]
    if "localhost" in local or "127.0.0.1" in local:
        local = local.replace("postgresql://", "postgresql://", 1)
        local += "" if "sslmode" in local else "?sslmode=prefer"

    with psycopg.connect(local, sslmode="prefer") as src, psycopg.connect(
        hosted, sslmode="require"
    ) as dst:
        rows = src.execute(
            """
            SELECT p.reference_number, ph.image_url, ph.image_file_page, ph.caption,
                   ph.source_name, ph.source_title, ph.attribution, ph.license_info,
                   ph.image_date, ph.is_representative, ph.source_type, ph.created_at,
                   ph.source_organization, ph.image_type
            FROM project_photos ph
            JOIN projects p ON p.id = ph.project_id
            """
        ).fetchall()
        print(f"local project_photos: {len(rows)}")

        ref_to_id = dict(
            dst.execute("SELECT reference_number, id FROM projects").fetchall()
        )
        cols = (
            "project_id, image_url, image_file_page, caption, source_name, source_title, "
            "attribution, license_info, image_date, is_representative, source_type, "
            "created_at, source_organization, image_type"
        )
        inserted = skipped = 0
        for row in rows:
            ref, *values = row
            project_id = ref_to_id.get(ref)
            if project_id is None:
                print(f"  skip {ref}: project not found in hosted db")
                continue
            exists = dst.execute(
                "SELECT 1 FROM project_photos WHERE project_id = %s AND image_url = %s",
                (project_id, values[0]),
            ).fetchone()
            if exists:
                skipped += 1
                continue
            placeholders = ", ".join(["%s"] * (len(values) + 1))
            dst.execute(
                f"INSERT INTO project_photos ({cols}) VALUES ({placeholders})",
                (project_id, *values),
            )
            inserted += 1
            print(f"  copied photo for {ref}")
        dst.commit()
        total = dst.execute("SELECT count(*) FROM project_photos").fetchone()[0]
        print(f"inserted={inserted} skipped={skipped} hosted total={total}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
