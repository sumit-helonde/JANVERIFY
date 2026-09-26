"""Phase 3 live-PostgreSQL diagnostic leg (task 120 pre-blocker).

DISK-VERIFIED-ONLY probe. Writes one report to
JANV_P3_PGPROBE env (default %TEMP%\\janv_p3_pgprobe.txt) and touches ONLY:

  - the maintenance DB `postgres` for read-only queries
  - one fresh scratch DB created/dropped inside THIS probe (unique name)
  - the PostGIS *extension catalog* (pg_available_extensions) - read-only

It NEVER touches the application's normal databases,
never writes to tasks.md, never declares Phase 3 verified, and only
reports the blocking facts. If something cannot be proven from disk,
the report says so and the single blocker is named.
"""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import time

REPORT = os.environ.get(
    "JANV_P3_PGPROBE",
    os.path.join(os.environ.get("TEMP", "."), "janv_p3_pgprobe.txt"),
)

HOST, PORT = "127.0.0.1", 5432

PG_BIN_DIRS = [
    r"C:\Program Files\PostgreSQL\16\bin",
    r"C:\Program Files\PostgreSQL\17\bin",
    r"C:\Program Files\PostgreSQL\18\bin",
    r"C:\Program Files\PostgreSQL\15\bin",
    r"C:\Program Files\PostgreSQL\14\bin",
    r"C:\Program Files\PostgreSQL\13\bin",
    r"C:\PostgreSQL\16\bin",
    r"C:\PostgreSQL\15\bin",
]

PATH_BIN_DIRS = [p for p in os.environ.get("PATH", "").split(os.pathsep) if p]

TOOLS = {
    "psql": None,
    "createdb": None,
    "dropdb": None,
}


def probe_tcp(host, port, timeout=4):
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def find_tools():
    found = {}
    for tool in ("psql", "createdb", "dropdb"):
        exe = tool + ".exe"
        hit = None
        for d in PG_BIN_DIRS:
            p = os.path.join(d, exe)
            if os.path.exists(p):
                hit = p
                break
        if hit is None:
            for d in PATH_BIN_DIRS:
                p = os.path.join(d, exe)
                if os.path.exists(p):
                    hit = p
                    break
        found[tool] = hit
    return found


def psql_run(bin_psql, sql, db="postgres", env=None, timeout=90):
    return subprocess.run(
        [bin_psql, "-h", HOST, "-p", str(PORT), "-d", db,
         "-X", "-A", "-t", "-c", sql],
        capture_output=True, text=True, encoding="utf-8",
        timeout=timeout, env=env,
    )


def main():
    L = []
    L.append("PROBE_WROTE_TS=" + time.strftime("%Y-%m-%dT%H:%M:%S"))
    L.append("HOST_PORT=%s:%s" % (HOST, PORT))
    L.append("TCP_RCH=%s" % ("PASS" if probe_tcp(HOST, PORT) else "FAIL"))

    tools = find_tools()
    for tool in ("psql", "createdb", "dropdb"):
        L.append("%s_EXE=%s" % (tool.upper(),
                                tools[tool] if tools[tool] else "NOT FOUND"))

    bin_psql = tools.get("psql")
    if not bin_psql:
        L.append("SERVER_REACHABLE=UNKNOWN (no psql.exe to query with)")
        L.append("AUTH=UNKNOWN")
        L.append("SUPERUSER=UNKNOWN")
        L.append("CREATEDB=UNKNOWN")
        L.append("POSTGIS_AVAIL=UNKNOWN")
        L.append("SCRATCH_CREATE=NOT TESTED (blocked: no psql.exe)")
        L.append("SCRATCH_DROP=NOT TESTED")
        L.append("POSTGIS_EXT_TEST=NOT TESTED")
        L.append("BLOCKERS=no psql.exe on disk; TCP on %s:%s is %s" % (
            HOST, PORT, "reachable" if probe_tcp(HOST, PORT) else "not reachable"))
        with open(REPORT, "w", encoding="utf-8") as fh:
            fh.write("\n".join(L) + "\n")
        return

    # one read-only query through an authenticated attempt. psql defaults to
    # the OS user if PGPASSWORD/user unspecified; try 'postgres' superuser.
    trials = [
        {"PGPASSWORD": os.environ.get("PGPASSWORD", "postgres"), "PGUSER": "postgres"},
        {"PGPASSWORD": os.environ.get("PGPASSWORD", "postgres")},  # no PGUSER
    ]
    auth_ok = False
    for i, env in enumerate(trials):
        e = dict(os.environ)
        e.update(env)
        r = psql_run(bin_psql,
                     "SELECT current_user || '|' || session_user || '|' "
                     "|| current_database() || '|' || version()", env=e)
        if r.returncode == 0 and r.stdout.strip():
            L.append("AUTH_TRY%d=PASS user=%s" % (i, env.get("PGUSER", "?")))
            pe = e
            auth_ok = True
            L.append("AUTH=OK")
            row = r.stdout.strip().split("|")
            L.append("CURRENT_USER=" + (row[0] if len(row) > 0 else "?"))
            L.append("SESSION_USER=" + (row[1] if len(row) > 1 else "?"))
            L.append("CURRENT_DB=" + (row[2] if len(row) > 2 else "?"))
            L.append("PG_VERSION=" + ((row[3].split(",")[0]) if len(row) > 3 else "?"))
            break
        else:
            L.append("AUTH_TRY%d=FAIL rc=%d" % (i, r.returncode))
            if r.stderr:
                L.append("AUTH_TRY%d_STDERR=%s" % (i, r.stderr.strip()[:300]))
    if not auth_ok:
        L.append("AUTH=FAIL")
        L.append("SUPERUSER=UNKNOWN")
        L.append("CREATEDB=UNKNOWN")
        L.append("POSTGIS_AVAIL=UNKNOWN")
        L.append("SCRATCH_CREATE=NOT TESTED (blocked: authentication)")
        L.append("SCRATCH_DROP=NOT TESTED")
        L.append("POSTGIS_EXT_TEST=NOT TESTED")
        L.append("BLOCKERS=server reachable at %s:%s but no working "
                 "superuser credentials among probes" % (HOST, PORT))
        with open(REPORT, "w", encoding="utf-8") as fh:
            fh.write("\n".join(L) + "\n")
        return

    # privilege check (read-only on maintenance DB)
    pr = psql_run(
        bin_psql,
        "SELECT rolsuper || '|' || rolcreatedb || '|' || rolcreaterole "
        "FROM pg_roles WHERE rolname = current_user",
        env=pe)
    if pr.returncode == 0 and pr.stdout.strip():
        parts = pr.stdout.strip().split("|")
        L.append("SUPERUSER=" + ("YES" if parts[0].lower() == "t" else "NO"))
        L.append("CREATEDB=" + ("YES" if parts[1].lower() == "t" else "NO"))
        L.append("CREATEROLE=" + ("YES" if len(parts) > 2 and parts[2].lower() == "t" else "NO"))
    else:
        L.append("SUPERUSER=UNKNOWN (%s)" % (pr.stderr.strip()[:200] if pr.stderr else "?"))
        L.append("CREATEDB=UNKNOWN")

    # PostGIS availability (read-only catalog)
    g = psql_run(
        bin_psql,
        "SELECT name || '|' || default_version FROM pg_available_extensions "
        "WHERE name = 'postgis'",
        env=pe)
    if g.returncode == 0 and g.stdout.strip():
        parts = g.stdout.strip().split("|")
        L.append("POSTGIS_AVAIL=YES")
        L.append("POSTGIS_DEFAULT_VER=" + (parts[1] if len(parts) > 1 else "?"))
    else:
        L.append("POSTGIS_AVAIL=" + ("NO" if g.returncode == 0 else "UNKNOWN"))
        L.append("POSTGIS_DEFAULT_VER=N/A")

    # superuser + createdb + pg_available postgis => safe to exercise scratch
    super_ok = any(x.endswith("=YES") for x in L if x.startswith("SUPERUSER="))
    createdb_ok = any(x.endswith("=YES") for x in L if x.startswith("CREATEDB="))
    postgis_catalog = any(x.endswith("=YES") for x in L if x.startswith("POSTGIS_AVAIL="))
    if not (super_ok and createdb_ok and postgis_catalog):
        why = []
        if not super_ok:
            why.append("user is not superuser")
        if not createdb_ok:
            why.append("no CREATEDB privilege")
        if not postgis_catalog:
            why.append("postgis not in pg_available_extensions")
        L.append("SCRATCH_CREATE=NOT TESTED (blocked: %s)" % "; ".join(why))
        L.append("SCRATCH_DROP=NOT TESTED")
        L.append("POSTGIS_EXT_TEST=NOT TESTED")
        L.append("BLOCKERS=" + "; ".join(why))
        with open(REPORT, "w", encoding="utf-8") as fh:
            fh.write("\n".join(L) + "\n")
        return

    # scratch DB create -> postgis ext -> drop, all against scratch only
    scratch = "janv_p3_probe_%d" % int(time.time() * 1000)
    cd = subprocess.run(
        [tools["createdb"], "-h", HOST, "-p", str(PORT), "-U", pe.get("PGUSER", "postgres"),
         scratch],
        capture_output=True, text=True, encoding="utf-8", timeout=120, env=pe)
    L.append("SCRATCH_CREATE=" + ("PASS (%s)" % scratch if cd.returncode == 0 else
                                  "FAIL rc=%d %s" % (cd.returncode, cd.stderr.strip()[:200])))
    if cd.returncode != 0:
        L.append("SCRATCH_DROP=NOT TESTED (no scratch DB was created)")
        L.append("POSTGIS_EXT_TEST=NOT TESTED")
        L.append("BLOCKERS=scratch DB create refused by server")
        with open(REPORT, "w", encoding="utf-8") as fh:
            fh.write("\n".join(L) + "\n")
        return

    # exercise CREATE EXTENSION INSIDE scratch only
    from psycopg import connect as _conn
    ext_ok = False
    try:
        with _conn(host=HOST, port=PORT, dbname=scratch,
                   user=pe.get("PGUSER", "postgres"),
                   password=pe.get("PGPASSWORD", "postgres")) as c:
            with c.cursor() as cur:
                cur.execute("CREATE EXTENSION IF NOT EXISTS postgis")
                cur.execute("SELECT PostGIS_Version()")
                v = cur.fetchone()[0]
        c.rollback if False else None
        ext_ok = True
        L.append("POSTGIS_EXT_TEST=PASS")
        L.append("POSTGIS_INSTALLED_VER=" + str(v))
    except Exception as ex:
        L.append("POSTGIS_EXT_TEST=FAIL %s" % (str(ex)[:250]))

    # drop scratch
    dd = subprocess.run(
        [tools["dropdb"], "-h", HOST, "-p", str(PORT), "-U", pe.get("PGUSER", "postgres"),
         "--if-exists", scratch],
        capture_output=True, text=True, encoding="utf-8", timeout=120, env=pe)
    L.append("SCRATCH_DROP=" + ("PASS" if dd.returncode == 0 else
                                "FAIL rc=%d %s" % (dd.returncode, dd.stderr.strip()[:200])))

    # verify scratch gone from pg_database (read-only)
    gone = psql_run(
        bin_psql,
        "SELECT 1 FROM pg_database WHERE datname = '%s'" % scratch,
        env=pe)
    still = gone.returncode == 0 and gone.stdout.strip() == "1"
    L.append("SCRATCH_GONE=" + ("PASS" if not still else "FAIL: still present"))

    L.append("BLOCKERS=" + ("none" if (ext_ok and dd.returncode == 0 and not still)
                            else "see SCRATCH_/POSTGIS_ line above"))

    with open(REPORT, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")


if __name__ == "__main__":
    try:
        main()
    except Exception as ex:
        with open(REPORT, "w", encoding="utf-8") as fh:
            import traceback
            fh.write("EXCEPTION\n" + traceback.format_exc()[:4000] + "\n")
        sys.exit(0)
