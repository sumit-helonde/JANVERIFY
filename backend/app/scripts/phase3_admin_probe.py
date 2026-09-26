"""Phase 3 admin-access discovery probe (disk-verified, read-only).

Reads/writes ONLY:
  REPORT = JANV_P3_ADMIN_PROBE env (default %TEMP%\\janv_p3_admin_probe.txt)

A single coherent self-contained module. No forward references, no
copy-paste debris. Safe: registry reads, pg_roles/pg_settings catalog
reads via psql (read-only SQL), sqlite READ ONLY for pgAdmin4.db counts,
pgpass/pgAdmin presence as YES/NO + counts only. NO credential, password,
or secret is ever read, printed, or written here. NO role/database/
service/registry modification, no config change, no DDL, no DML.
"""

from __future__ import annotations

import os
import sqlite3
import subprocess
import time
import winreg

HOST, PORT = "127.0.0.1", "5432"
REPORT = os.environ.get(
    "JANV_P3_ADMIN_PROBE",
    os.path.join(os.environ.get("TEMP", "."), "janv_p3_admin_probe.txt"),
)

PSQL = r"C:\Program Files\PostgreSQL\16\bin\psql.exe"

INST_KEY = r"SOFTWARE\PostgreSQL\Installations"
SVC_KEY = r"SYSTEM\CurrentControlSet\Services"

ACCESS = winreg.KEY_READ | winreg.KEY_WOW64_64KEY
SVC_ACCESS = winreg.KEY_READ | winreg.KEY_WOW64_64KEY


def enum_subkeys(root, path, access=ACCESS):
    out = []
    try:
        with winreg.OpenKey(root, path, 0, access) as k:
            i = 0
            while True:
                try:
                    out.append(winreg.EnumKey(k, i))
                    i += 1
                except OSError:
                    break
    except OSError:
        pass
    return out


def reg_value(root, path, name, access=ACCESS):
    try:
        with winreg.OpenKey(root, path, 0, access) as k:
            v, _ = winreg.QueryValueEx(k, name)
            return str(v)
    except OSError:
        return None
    except TypeError:
        return None


def psql(sql, env):
    return subprocess.run(
        [PSQL, "-h", HOST, "-p", PORT, "-X", "-A", "-t", "-c", sql],
        capture_output=True, text=True, encoding="utf-8", timeout=120,
        env=env)


def count_pgadmin_servers(dbpath):
    try:
        con = sqlite3.connect("file:" + dbpath.replace("\\", "/")
                              + "?mode=ro", uri=True)
        con.execute("PRAGMA query_only=ON")
        cur = con.execute("SELECT count(*) FROM server")
        n = cur.fetchone()
        con.close()
        return n[0] if n is not None else 0
    except Exception:
        return None


def main():
    L = []
    L.append("PROBE_TS=" + time.strftime("%Y-%m-%dT%H:%M:%S"))
    L.append("HOST_PORT=%s:%s" % (HOST, PORT))

    env = dict(os.environ)
    env.setdefault("PGPASSWORD", "postgres")
    env.setdefault("PGUSER", "postgres")

    # ---- 1+5. install dir + version + data dir via registry ----
    keys = enum_subkeys(winreg.HKEY_LOCAL_MACHINE, INST_KEY)
    if keys:
        base = INST_KEY + "\\" + keys[0]
        bd = reg_value(winreg.HKEY_LOCAL_MACHINE, base, "Base Directory")
        ver = reg_value(winreg.HKEY_LOCAL_MACHINE, base, "Version")
        dd = reg_value(winreg.HKEY_LOCAL_MACHINE, base, "Data Directory")
        L.append("INSTALL_DIR=" + (bd if bd else "UNKNOWN"))
        L.append("INSTALL_VERSION=" + (ver if ver else "UNKNOWN"))
        L.append("REG_DATA_DIR=" + (dd if dd else "UNKNOWN"))
        L.append("INSTALL_KEYS=%d" % len(keys))
    else:
        L.append("INSTALL_DIR=NOT FOUND in HKLM 64-bit registry")
        L.append("INSTALL_VERSION=UNKNOWN")
        L.append("REG_DATA_DIR=UNKNOWN")
        L.append("INSTALL_KEYS=0")

    # ---- 2+6. live version + live data directory (read-only) ----
    vr = psql("SELECT version()", env)
    if vr.returncode == 0 and vr.stdout.strip():
        L.append("LIVE_VERSION=" + vr.stdout.strip().splitlines()[0][:120])
    else:
        L.append("LIVE_VERSION=UNKNOWN (%s)" %
                 (vr.stderr.strip()[:120] if vr.stderr else "?"))
    dr = psql("SHOW data_directory", env)
    if dr.returncode == 0 and dr.stdout.strip():
        L.append("LIVE_DATA_DIR=" + dr.stdout.strip())
    else:
        L.append("LIVE_DATA_DIR=UNKNOWN")

    # ---- 3. Windows PostgreSQL service via registry ----
    found = []
    for name in enum_subkeys(winreg.HKEY_LOCAL_MACHINE, SVC_KEY,
                             SVC_ACCESS):
        p = SVC_KEY + "\\" + name
        ip = reg_value(winreg.HKEY_LOCAL_MACHINE, p, "ImagePath")
        if ip and "postgres" in ip.lower():
            account = reg_value(winreg.HKEY_LOCAL_MACHINE, p, "ObjectName")
            found.append((name, account, ip))
    if found:
        nm, acct, img = found[0]
        L.append("SERVICE_NAME=" + nm)
        L.append("SERVICE_ACCOUNT=" + (acct if acct else "UNKNOWN"))
        L.append("SERVICE_IMAGE=" + img)
        L.append("SERVICE_COUNT=%d" % len(found))
    else:
        L.append("SERVICE_NAME=NOT FOUND in registry Services scan")
        L.append("SERVICE_ACCOUNT=UNKNOWN")
        L.append("SERVICE_IMAGE=UNKNOWN")
        L.append("SERVICE_COUNT=0")

    # ---- 4. pgAdmin presence + server definition COUNT (no creds) ----
    pgadm = os.path.join(os.environ.get("APPDATA", ""), "pgAdmin")
    if os.path.isdir(pgadm):
        L.append("PGADMIN_PRESENT=YES")
        L.append("PGADMIN_DIR=" + pgadm)
        db = os.path.join(pgadm, "pgadmin4.db")
        if os.path.isfile(db):
            n = count_pgadmin_servers(db)
            L.append("PGADMIN_STORED_SERVERS=" + (str(n) if n is not None
                                                  else "UNREADABLE"))
        else:
            L.append("PGADMIN_STORED_SERVERS=0 (no pgadmin4.db)")
    else:
        L.append("PGADMIN_PRESENT=NO")
        L.append("PGADMIN_STORED_SERVERS=0")

    # ---- 7+8. roles + safe privilege metadata (read-only pg_roles) ----
    r = psql("SELECT rolname || '|' || rolsuper || '|' || rolcreatedb "
             "|| '|' || rolcreaterole || '|' || rolcanlogin "
             "FROM pg_roles ORDER BY 1", env)
    if r.returncode == 0 and r.stdout.strip():
        L.append("ROLES_QUERY=OK")
        for line in r.stdout.splitlines():
            p = line.split("|")
            if len(p) != 5:
                continue
            L.append("ROLE %s|super=%s|createdb=%s|createrole=%s|canlogin=%s"
                     % tuple(p[:5]))
    else:
        L.append("ROLES_QUERY=FAIL (%s)" %
                 (r.stderr.strip()[:160] if r.stderr else "?"))

    # ---- 9. pgpass presence (YES/NO + line count only) ----
    pgpass = os.path.join(os.environ.get("APPDATA", ""), "postgresql",
                          "pgpass.conf")
    L.append("PGPASS_PRESENT=" + ("YES" if os.path.isfile(pgpass) else "NO"))
    if os.path.isfile(pgpass):
        try:
            n = sum(1 for _ in open(pgpass, encoding="utf-8",
                                    errors="ignore"))
        except OSError:
            n = -1
        L.append("PGPASS_LINES=%d (content never printed)" % n)

    # ---- 10. decision (no change, no credential shown) ----
    L.append("ADMIN_ROUTE=IDENTIFY_ONLY")
    L.append("ACTION=stopped before any service/role/config change")

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
