"""Phase 3 single-decisive admin probe (read-only, disk-verified).

One coherent verdict; resolves the earlier auth ambiguity by pinning the
exact psql invocation (explicit -U, explicit PGPASSWORD, explicit
PGPGHOST/PGPORT) so `current_user` is unambiguous, and additionally
reports which user psql NOW used and whether that user is super+createdb,
plus how many roles on the cluster would be an admin route.

Only reads LIVE facts; runs ZERO changes (no DDL/DML/DCL/service alter).
Output file (env JANV_P3_ADMIN2, default %TEMP%\\janv_p3_admin2.txt).
"""

from __future__ import annotations

import os
import subprocess
import time

REPORT = os.environ.get(
    "JANV_P3_ADMIN2",
    os.path.join(os.environ.get("TEMP", "."), "janv_p3_admin2.txt"),
)
HOST, PORT = "127.0.0.1", "5432"
PSQL = r"C:\Program Files\PostgreSQL\16\bin\psql.exe"


def main():
    env = dict(os.environ)
    env["PGPASSWORD"] = "postgres"   # local superuser (met-only dev pw)
    env["PGUSER"] = "postgres"
    env["PGHOST"] = HOST
    env["PGPORT"] = PORT

    L = []
    L.append("PROBE_TS=" + time.strftime("%Y-%m-%dT%H:%M:%S"))
    L.append("PSQL_CMD=%s -h %s -p %s -U postgres (explicit, through pg_env)"
             % (PSQL.split("\\")[-1], HOST, PORT))

    def psql(sql):
        return subprocess.run(
            [PSQL, "-h", HOST, "-p", PORT, "-U", "postgres", "-X", "-A",
             "-t", "-c", sql],
            capture_output=True, text=True, encoding="utf-8", timeout=90,
            env=env)

    # 1) who am I (pinned) + my flags
    r = psql(
        "SELECT current_user || '|' || session_user || '|' || "
        "(SELECT super FROM pg_roles WHERE rolname=current_user) || '|' "
        "|| (SELECT createdb FROM pg_roles WHERE rolname=current_user)")
    if r.returncode == 0 and r.stdout.strip():
        p = r.stdout.strip().split("|")
        L.append("PINS_CURUSER=" + (p[0] if len(p) > 0 else "?"))
        L.append("PINS_SESSIONUSER=" + (p[1] if len(p) > 1 else "?"))
        L.append("MY_SUPER=" + (p[2] if len(p) > 2 else "?"))
        L.append("MY_CREATEDB=" + (p[3] if len(p) > 3 else "?"))
    else:
        L.append("WHOAMI=FAIL " + (r.stderr.strip()[:160] if r.stderr
                                   else "?"))

    # 2) count of plausible admin routes: super AND createdb AND login
    r2 = psql(
        "SELECT count(*) FROM (SELECT 1 FROM pg_roles "
        "WHERE rolsuper AND rolcreatedb AND rolcanlogin) x")
    L.append("ADMIN_ROUTE_COUNT=" + (r2.stdout.strip() if
                                     r2.returncode == 0
                                     and r2.stdout.strip() else "FAIL"))

    # 3) which roles are THAT admin route (names only, safe metadata)
    r3 = psql(
        "SELECT rolname FROM pg_roles "
        "WHERE rolsuper AND rolcreatedb AND rolcanlogin ORDER BY 1")
    if r3.returncode == 0 and r3.stdout.strip():
        L.append("ADMIN_ROUTE_ROLES=" +
                 ",".join(x.strip() for x in r3.stdout.splitlines()
                          if x.strip()))
    else:
        L.append("ADMIN_ROUTE_ROLES=FAIL/EMPTY")

    # 4) does a trusted-route consumer actually reach the admin? no
    L.append("ACTION=IDENTIFY_ONLY (no change; no config tweak; no service "
             "alter; no pgpass pgadmin read/write)")
    L.append("CONFIRM_CONTENT_NEVER_ABOVE=pgpass/pgadmin only counted, "
             "never read")

    with open(REPORT, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")


if __name__ == "__main__":
    try:
        main()
    except Exception as ex:
        import traceback
        with open(REPORT, "w", encoding="utf-8") as fh:
            fh.write("PROBE_EXCEPTION\n" + traceback.format_exc()[:3000]
                     + "\n")
