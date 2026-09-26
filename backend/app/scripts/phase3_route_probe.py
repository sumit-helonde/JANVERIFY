"""Decisive admin-route probe (disk-verified; settles the contradiction).

Resolves, with ONE coherent connection per attempt row, whether the exact
connection the Phase-3 migration runner will use can reach a PostgreSQL
superuser with CREATEDB and PostGIS.

Reads/writes ONLY:
  REPORT = JANV_P3_ROUTE env (default %TEMP%\\janv_p3_route_probe.txt)

The connection env pinning here EXACTLY mirrors phase3_migrate.py:
   PGHOST/127.0.0.1  PGPORT/5432  PGUSER=postgres  PGPASSWORD=postgres
(those constants are ADMIN_HOST/ADMIN_PORT/ADMIN_USER/ADMIN_PASS at the
top of phase3_migrate.py and are the lockage the runner uses.)

Every attempt issues ONLY read-only SQL:
   SELECT current_user, session_user, current_database();
   SELECT rolsuper, rolcreatedb, rolcreaterole, rolcanlogin
          FROM pg_roles WHERE rolname = current_user;
   SELECT count(*) FROM pg_available_extensions
          WHERE name = 'postgis';      -- availability only
NO CREATE/DROP/ALTER of any role, DB, extension, object, or setting.
NO pgcc or registry or service change. NO credential printed — the
PGPASSWORD below is the well-known local dev password already used by
this project's runner; it is never written to the report (only the auth
outcome PASS/FAIL is).
"""

from __future__ import annotations

import os
import subprocess
import time

REPORT = os.environ.get(
    "JANV_P3_ROUTE",
    os.path.join(os.environ.get("TEMP", "."), "janv_p3_route_probe.txt"),
)

HOST, PORT = "127.0.0.1", "5432"
USER, PASS = "postgres", "postgres"
PSQL = r"C:\Program Files\PostgreSQL\16\bin\psql.exe"


def run_psql(sql, env):
    return subprocess.run(
        [PSQL, "-h", HOST, "-p", PORT, "-X", "-A", "-t", "-c", sql],
        capture_output=True, text=True, encoding="utf-8", timeout=120,
        env=env)


def main():
    L = []
    L.append("ROUTE_TS=" + time.strftime("%Y-%m-%dT%H:%M:%S"))
    L.append("ROUTE_TARGET=%s:%s as %s (same env the migrate runner uses)"
             % (HOST, PORT, USER))

    env = dict(os.environ)
    env["PGHOST"] = HOST
    env["PGPORT"] = PORT
    env["PGUSER"] = USER
    env["PGPASSWORD"] = PASS

    # --- identity row ---
    idr = run_psql(
        "SELECT current_user, session_user, current_database()", env)
    if idr.returncode == 0 and idr.stdout.strip():
        p = idr.stdout.strip().split("|")
        L.append("AUTH=PASS")
        L.append("CURRENT_USER=" + (p[0] if len(p) > 0 else "?"))
        L.append("SESSION_USER=" + (p[1] if len(p) > 1 else "?"))
        L.append("CURRENT_DB=" + (p[2] if len(p) > 2 else "?"))
    else:
        L.append("AUTH=FAIL (" +
                 (idr.stderr.strip()[:120] if idr.stderr else "?") + ")")

    # --- privilege flags of current_user ---
    pr = run_psql(
        "SELECT rolsuper, rolcreatedb, rolcreaterole, rolcanlogin "
        "FROM pg_roles WHERE rolname = current_user", env)
    if pr.returncode == 0 and pr.stdout.strip():
        p = pr.stdout.strip().split("|")
        L.append("SUPERUSER=" + ("YES" if len(p) > 0 and p[0] == "t"
                                 else "NO"))
        L.append("CREATEDB=" + ("YES" if len(p) > 1 and p[1] == "t"
                                else "NO"))
        L.append("CREATEROLE=" + ("YES" if len(p) > 2 and p[2] == "t"
                                  else "NO"))
        L.append("CANLOGIN=" + ("YES" if len(p) > 3 and p[3] == "t"
                                else "NO"))
    else:
        L.append("SUPERUSER=FQFAIL")
        L.append("CREATEDB=FQFAIL")
        L.append("CREATEROLE=FQFAIL")
        L.append("CANLOGIN=FQFAIL")

    # --- postgis availability (catalog presence; install NOT attempted) ---
    gr = run_psql(
        "SELECT count(*) FROM pg_available_extensions WHERE name='postgis'",
        env)
    if gr.returncode == 0 and gr.stdout.strip() == "1":
        L.append("POSTGIS_AVAILABLE=YES")
    else:
        L.append("POSTGIS_AVAILABLE=NO/UNKNOWN ("
                 + (gr.stderr.strip()[:100] if gr.stderr else "") + ")")

    L.append("ACTION=IDENTIFY_ONLY (nothing created, dropped, altered, "
             "or changed)")

    with open(REPORT, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")


if __name__ == "__main__":
    try:
        main()
    except Exception as ex:
        import traceback
        with open(REPORT, "w", encoding="utf-8") as fh:
            fh.write("ROUTE_PROBE_EXCEPTION\n" + traceback.format_exc()[
                :3000] + "\n")
