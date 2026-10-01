"""CivicWatch neutral-team moderation: edit + delete.

The rule under test: only the JANVERIFY neutral team (``admin``; ``reviewer`` is
accepted too where that role exists) may modify or remove a civic issue record.
Citizens, authority, department and contractor accounts keep their existing
rights and must not gain write access.

Every test creates its own throwaway issue through the real citizen multipart
endpoint and removes it afterwards, so nothing here depends on - or damages -
the existing demo records. Users are temporary rows so the referential
integrity of ``civic_issues.reported_by_id`` and ``audit_logs.actor_id`` holds.
"""

import io

import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient

from app.api.routes.auth import get_current_user
from app.core.db import SessionLocal, engine
from app.main import app

pytestmark = pytest.mark.db

PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00"
    b"\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00"
    b"\x00\x00IEND\xaeB`\x82"
)

# Only these roles satisfy the users table CHECK constraint.
NON_NEUTRAL = ["citizen", "inspector", "department_official", "contractor"]
NEUTRAL = ["admin"]
ALL_ROLES = NON_NEUTRAL + NEUTRAL
TAG = "cwmod"


@pytest.fixture(scope="module")
def users():
    """Create one real user per role, and drop them when the module ends."""
    from app.api.routes._db import T

    engine.dispose()
    with SessionLocal() as db:
        table = T["users"]
        rows = {}
        for role in ALL_ROLES:
            email = f"{TAG}.{role}@janverify.test"
            db.execute(sa.delete(table).where(table.c.email == email))
            uid = db.execute(
                sa.insert(table).values(
                    email=email,
                    full_name=f"Moderation {role}",
                    password_hash="pbkdf2$not-used-in-tests",
                    role=role,
                    status="active",
                ).returning(table.c.id)
            ).scalar_one()
            rows[role] = {"id": uid, "role": role, "status": "active", "email": email}
        db.commit()
    yield rows
    with SessionLocal() as db:
        db.execute(sa.delete(T["users"]).where(T["users"].c.email.like(f"{TAG}.%")))
        db.commit()


@pytest.fixture()
def as_role(users):
    """Factory returning a client authenticated as the given real role."""
    with TestClient(app) as client:
        def use(role: str) -> TestClient:
            app.dependency_overrides[get_current_user] = lambda: users[role]
            return client

        yield use
        app.dependency_overrides.pop(get_current_user, None)


def _seed_issue(client: TestClient) -> str:
    res = client.post(
        "/api/civicwatch/issues",
        files={"photo": ("p.png", io.BytesIO(PNG), "image/png")},
        data={
            "title": "Moderation test issue",
            "description": "Throwaway issue created by the moderation test suite.",
            "category": "Roads",
            "ward": "Ward 1",
            "location": "Ward 1, Nagpur",
        },
    )
    assert res.status_code == 201, res.text
    return res.json()["issue_reference"]


# --- RBAC ------------------------------------------------------------------


@pytest.mark.parametrize("role", NON_NEUTRAL)
def test_non_neutral_roles_cannot_edit(as_role, role):
    ref = _seed_issue(as_role("citizen"))
    try:
        client = as_role(role)
        res = client.patch(f"/api/civicwatch/issues/{ref}", json={"title": "Hijacked title"})
        assert res.status_code == 403, res.text
        assert client.get(f"/api/civicwatch/issues/{ref}").json()["title"] == "Moderation test issue"
    finally:
        as_role("admin").delete(f"/api/civicwatch/issues/{ref}")


@pytest.mark.parametrize("role", NON_NEUTRAL)
def test_non_neutral_roles_cannot_delete(as_role, role):
    ref = _seed_issue(as_role("citizen"))
    try:
        client = as_role(role)
        res = client.delete(f"/api/civicwatch/issues/{ref}")
        assert res.status_code == 403, res.text
        assert client.get(f"/api/civicwatch/issues/{ref}").status_code == 200
    finally:
        as_role("admin").delete(f"/api/civicwatch/issues/{ref}")


def test_anonymous_cannot_edit_or_delete(client):
    assert client.patch("/api/civicwatch/issues/CW-101", json={"title": "x"}).status_code == 401
    assert client.delete("/api/civicwatch/issues/CW-101").status_code == 401


# --- capabilities ----------------------------------------------------------


def test_capabilities_expose_moderation_only_to_neutral_team(as_role):
    for role in NON_NEUTRAL:
        caps = as_role(role).get("/api/civicwatch/issues/CW-101").json()["capabilities"]
        assert caps["can_edit"] is False, role
        assert caps["can_delete"] is False, role
    for role in NEUTRAL:
        caps = as_role(role).get("/api/civicwatch/issues/CW-101").json()["capabilities"]
        assert caps["can_edit"] is True, role
        assert caps["can_delete"] is True, role


# --- neutral-team round trip ----------------------------------------------


def test_admin_can_edit_and_delete(as_role):
    ref = _seed_issue(as_role("citizen"))
    client = as_role("admin")

    res = client.patch(
        f"/api/civicwatch/issues/{ref}",
        json={
            "title": "Corrected title by neutral team",
            "description": "Corrected description by the JANVERIFY neutral team.",
            "ward": "Ward 42",
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["title"] == "Corrected title by neutral team"
    assert body["ward"] == "Ward 42"
    assert body["location"] == "Ward 42, Nagpur"

    res = client.delete(f"/api/civicwatch/issues/{ref}")
    assert res.status_code == 200, res.text
    assert res.json()["deleted"] is True
    assert res.json()["issue_reference"] == ref
    assert client.get(f"/api/civicwatch/issues/{ref}").status_code == 404


def test_admin_can_edit_coordinates_and_category(as_role):
    ref = _seed_issue(as_role("citizen"))
    client = as_role("admin")
    try:
        res = client.patch(
            f"/api/civicwatch/issues/{ref}",
            json={"latitude": 21.1458, "longitude": 79.0882, "category": "Water Supply"},
        )
        assert res.status_code == 200, res.text
        assert res.json()["category_key"] == "water"
        assert float(res.json()["latitude"]) == pytest.approx(21.1458)
    finally:
        client.delete(f"/api/civicwatch/issues/{ref}")


def test_edit_is_audited(as_role):
    ref = _seed_issue(as_role("citizen"))
    client = as_role("admin")
    try:
        client.patch(f"/api/civicwatch/issues/{ref}", json={"title": "Audited correction here"})
        events = client.get(f"/api/civicwatch/issues/{ref}/timeline").json()["items"]
        assert any(e.get("action") == "update" for e in events), events
    finally:
        client.delete(f"/api/civicwatch/issues/{ref}")


def test_delete_is_audited_after_removal(as_role):
    ref = _seed_issue(as_role("citizen"))
    client = as_role("admin")
    client.request("DELETE", f"/api/civicwatch/issues/{ref}", json={"note": "duplicate of an existing report"})

    body = client.get("/api/audit-logs").json()
    entries = body if isinstance(body, list) else body.get("items", [])
    deletes = [
        e for e in entries
        if e.get("action") == "delete" and f"REF={ref}" in str(e.get("source") or "")
    ]
    assert deletes, "delete must leave an audit trail entry"


# --- validation ------------------------------------------------------------


def test_edit_rejects_invalid_fields(as_role):
    ref = _seed_issue(as_role("citizen"))
    client = as_role("admin")
    try:
        assert client.patch(f"/api/civicwatch/issues/{ref}", json={"title": "ab"}).status_code == 422
        assert client.patch(f"/api/civicwatch/issues/{ref}", json={"latitude": 400}).status_code == 422
        assert client.patch(
            f"/api/civicwatch/issues/{ref}", json={"category": "Not A Category"}
        ).status_code == 422
        assert client.patch(f"/api/civicwatch/issues/{ref}", json={}).status_code == 422
        assert client.patch(
            f"/api/civicwatch/issues/{ref}", json={"description": "short"}
        ).status_code == 422
    finally:
        client.delete(f"/api/civicwatch/issues/{ref}")


def test_missing_issue_is_404(as_role):
    assert as_role("admin").patch("/api/civicwatch/issues/CW-999999", json={"title": "x"}).status_code == 404
    assert as_role("admin").delete("/api/civicwatch/issues/CW-999999").status_code == 404