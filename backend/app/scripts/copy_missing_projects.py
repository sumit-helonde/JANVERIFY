"""Copy project rows (and related data) from the local DB to the hosted DB.

Rows are matched by project reference number because primary keys differ
between the two databases. Only the tables needed for the projects list, project
detail page and map are copied.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[2]
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

import psycopg  # noqa: E402

LOCAL_ENV = BACKEND / ".env"

# table -> column that links the row back to a project
CHILD_TABLES = {
    "project_locations": "project_id",
    "project_photos": "project_id",
    "project_sources": "project_id",
    "budgets": "project_id",
    "contracts": "project_id",
    "tenders": "project_id",
    "evidence": "project_id",
    "documents": "project_id",
    "progress_reports": "project_id",
    "inspections": "project_id",
    "payments": "project_id",
    "claims": "project_id",
    "project_relationships": "project_id",
    "citizen_reports": "project_id",
    "anomalies": "project_id",
}


def local_url() -> str:
    for line in LOCAL_ENV.read_text(encoding="utf-8").splitlines():
        if line.strip().startswith("DATABASE_URL"):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("DATABASE_URL not found in backend/.env")


def columns(conn, table: str) -> list[str]:
    cur = conn.execute(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_schema='public' AND table_name=%s ORDER BY ordinal_position",
        (table,),
    )
    return [r[0] for r in cur.fetchall()]


def quote(names: list[str]) -> str:
    """Quote identifiers: some columns are mixed-case (e.g. "X")."""
    return ", ".join(f'"{n}"' for n in names)


def main() -> int:
    hosted = os.environ["DATABASE_URL"]
    if hosted.startswith("postgres://"):
        hosted = "postgresql://" + hosted[len("postgres://") :]
    local = local_url()
    if local.startswith("postgresql+psycopg://"):
        local = "postgresql://" + local[len("postgresql+psycopg://") :]
    if "sslmode" not in local:
        local += "?sslmode=prefer"

    with psycopg.connect(local, sslmode="prefer") as src, psycopg.connect(
        hosted, sslmode="require"
    ) as dst:
        src_refs = {r[0] for r in src.execute("SELECT reference_number FROM projects")}
        dst_refs = {r[0] for r in dst.execute("SELECT reference_number FROM projects")}
        missing = sorted(src_refs - dst_refs)
        print(f"projects local={len(src_refs)} hosted={len(dst_refs)} missing={missing}")
        if not missing:
            print("nothing to copy")
            return 0

        id_map: dict[int, int] = {}
        proj_cols = columns(dst, "projects")
        src_cols = set(columns(src, "projects"))
        shared = [c for c in proj_cols if c in src_cols]
        if "id" not in shared or "reference_number" not in shared:
            raise SystemExit(f"no usable shared columns for projects: {shared}")
        print(f"projects columns copied: {len(shared)}")

        # Lookup ids differ too, so remap them by their natural keys.
        def key_map(table: str, key: str) -> dict:
            src_keys = dict(src.execute(f"SELECT {quote([key])}, id FROM {table}").fetchall())
            dst_keys = dict(dst.execute(f"SELECT {quote([key])}, id FROM {table}").fetchall())
            return {sid: dst_keys[k] for k, sid in src_keys.items() if k in dst_keys}

        lookup_col = {
            "category_id": key_map("project_categories", "name"),
            "department_id": key_map("departments", "code"),
        }
        print(f"lookup maps: categories={len(lookup_col['category_id'])} departments={len(lookup_col['department_id'])}")

        for ref in missing:
            row = src.execute(
                f"SELECT {quote(shared)} FROM projects WHERE reference_number = %s", (ref,)
            ).fetchone()
            values = list(row)
            for col, mapping in lookup_col.items():
                if col in shared and values[shared.index(col)] is not None:
                    values[shared.index(col)] = mapping.get(values[shared.index(col)])
            placeholders = ", ".join(["%s"] * len(shared))
            new = dst.execute(
                f"INSERT INTO projects ({quote(shared)}) VALUES ({placeholders}) RETURNING id",
                tuple(values),
            ).fetchone()
            id_map[row[shared.index("id")]] = new[0]
            print(f"  copied project {ref} -> id {new[0]}")

        for table, fk in CHILD_TABLES.items():
            try:
                cols = columns(dst, table)
            except Exception:
                continue
            if fk not in cols or "id" not in cols:
                continue
            payload_cols = [c for c in cols if c not in ("id", fk)]
            src_cols_tbl = set(columns(src, table))
            payload_cols = [c for c in payload_cols if c in src_cols_tbl]
            if not payload_cols:
                continue
            select_cols = ", ".join(payload_cols)
            total = 0
            for old_id, new_id in id_map.items():
                rows = src.execute(
                    f"SELECT {select_cols} FROM \"{table}\" WHERE \"{fk}\" = %s", (old_id,)
                ).fetchall()
                for r in rows:
                    placeholders = ", ".join(["%s"] * (len(payload_cols) + 1))
                    dst.execute(
                        f"INSERT INTO \"{table}\" ({quote(payload_cols)}, \"{fk}\") "
                        f"VALUES ({placeholders})",
                        (*r, new_id),
                    )
                    total += 1
            if total:
                dst.commit()
                print(f"  {table}: copied {total} row(s)")
        dst.commit()
        print("done")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
