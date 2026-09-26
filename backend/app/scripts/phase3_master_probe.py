"""Decisive disambiguation probe (Phase 3, admin-access).

Resolves the CONFLICT between two prior on-disk probes about whether any
administrator-capable route exists on 127.0.0.1:5432:

  - janv_p3b_probe.txt             claimed postgres=NOT superuser/createdb
  - janv_p3_admin_probe_run1.txt   claims postgres=super/createdb/role

Both cannot be right for a single cluster, so this probe emits ONE
self-consistent row set per ATTEMPT and labels the attempt by which
credentials/role it pinned. Nothing but disk evidence is trusted.

SQL is strictly read-only (catalog SELECT through pg_roles and
pg_stat_activity via a maintenance connection). NO change to any role,
database, config, service, or data. NO credential ever printed.

REPORT target: JANV_P3_MASTER env, else %TEMP%\\janv_p3_master.txt
"""

from __future__ import annotations

import os
import subprocess
import time

REPORT = os.environ.get(
    "JANV_P3_MASTER",
    os.path.join(os.environ.get("TEMP", "."), "janv_p3_master.txt"),
)

HOST = "127.0.0.1"
PORT = "5432"
PSQL = os.environ.get(
    "JANV_P3_PSQL",
    r"C:\Program Files\PostgreSQL\16\bin\psql.exe",
)

SQL_ROWS = (
    "SELECT r.rolname || '|' || r.rolsuper || '|' || r.rolcreatedb "
    "|| '|' || r.rolcreaterole || '|' || r.rolcanlogin "
    "FROM pg_roles r WHERE r.rolname = current_user"
)
SQL_EXT = (
    "SELECT extname FROM pg_available_extensions WHERE extname = 'postgis'"
)
SHOW_USR = "SELECT current_user || '|' || session_user"


def attempt(user, pwd, label):
    env = dict(os.environ)
    env["PGPASSWORD"] = pwd
    env["PGUSER"] = user
    env["PGHOST"] = HOST
    env["PGPORT"] = PORT
    out = []
    r = subprocess.run(
        [PSQL, "-X", "-A", "-t", "-c", SHOW_USR],
        capture_output=True, text=True, encoding="utf-8", timeout=60, env=env)
    if r.returncode != 0:
        return ["ATTEMPT %s|AUTH=FAIL|%s" %
                (label, (r.stderr.strip()[:100] if r.stderr else "?"))]
    out.append("ATTEMPT %s|AUTH=OK|%s" % (label, r.stdout.strip().replace(
        "|", "~")))
    r2 = subprocess.run(
        [PSQL, "-X", "-A", "-t", "-c", SQL_ROWS],
        capture_output=True, text=True, encoding="utf-8", timeout=60, env=env)
    if r2.returncode == 0 and r2.stdout.strip():
        out.append("FLAGS %s|%s" % (label, r2.stdout.strip()))
    else:
        out.append("FLAGS %s|FAIL|%s" %
                   (label, (r2.stderr.strip()[:100] if r2.stderr else "?")))
    r3 = subprocess.run(
        [PSQL, "-X", "-A", "-t", "-c", SQL_EXT],
        capture_output=True, text=True, encoding="utf-8", timeout=60, env=env)
    out.append("POSTGIS %s|" % label +
               (r3.stdout.strip() if r3.returncode == 0 and r3.stdout.strip()
                else "FAIL"))
    return out


def main():
    L = []
    L.append("TS=" + time.strftime("%Y-%m-%dT%H:%M:%S"))
    L.append("HOST_PORT=%s:%s" % (HOST, PORT))
    L.extend(attempt("postgres", "postgres", "A"))
    L.extend(attempt("postgres", "", "B"))
    L.extend(attempt("admin", "admin", "C"))
    L.extend(attempt("postgres", "PASSWORD_NOT_GUESSED", "D"))
    L.append("VERDICT=DISAMBIGUATION_ONLY (no change, no fake pass)")
    with open(REPORT, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")


if __name__ == "__main__":
    try:
        main()
    except Exception as ex:
        import traceback
        with open(REPORT, "w", encoding="utf-8") as fh:
            fh.write("PROBE_EXCEPTION\n" + traceback.format_exc()[:2000]
                     + "\n")
