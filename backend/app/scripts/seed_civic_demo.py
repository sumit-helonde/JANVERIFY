"""Idempotent seed: role-demo accounts + CivicWatch demo issues.

Creates the four clearly-labelled demo accounts behind the role-based login
(premium role cards) and the three CivicWatch demo issues used by the 4-role
demo flow. Every business row carries the ``SYNTHETIC HACKATHON DATA`` marker.
Recorded demo password for every account: ``demo1234`` (PBKDF2 hashed, never
plaintext). Images are representative Wikimedia Commons photos -- they are
never evidence of any real Nagpur incident.

Usage (run from the backend/ directory):
    .venv\\Scripts\\python.exe app\\scripts\\seed_civic_demo.py
    .venv\\Scripts\\python.exe app\\scripts\\seed_civic_demo.py --reset-civic
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sqlalchemy import delete, select

from app.api.routes._db import T
from app.api.routes.auth import hash_password
from app.core.db import SessionLocal

SYNTHETIC_TAG = "SYNTHETIC HACKATHON DATA"
NOW = datetime.now(timezone.utc)

DEMO_PASSWORD = "demo1234"

DEMO_ACCOUNTS = [
    {
        "email": "citizen@janverify.demo",
        "full_name": f"Demo Citizen [{SYNTHETIC_TAG}]",
        "role": "citizen",
        "phone": "+91-7000000001",
    },
    {
        "email": "authority@janverify.demo",
        "full_name": f"Demo Authority [{SYNTHETIC_TAG}]",
        "role": "inspector",
        "phone": "+91-7000000002",
    },
    {
        "email": "government@janverify.demo",
        "full_name": f"Demo Government Official [{SYNTHETIC_TAG}]",
        "role": "department_official",
        "phone": "+91-7000000003",
    },
    {
        "email": "team@janverify.demo",
        "full_name": f"JANVERIFY Neutral Team [{SYNTHETIC_TAG}]",
        "role": "admin",
        "phone": "+91-7000000004",
    },
]

CIVIC_IMAGES = {
    "pothole_main": {
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Potholes_on_road.jpg/960px-Potholes_on_road.jpg",
        "caption": "Potholed road surface (Assam, India).",
        "attribution": "KEmel49",
        "license": "CC BY-SA 4.0",
    },
    "pothole_evidence": {
        "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Driving_through_potholes.jpg?width=960",
        "caption": "Vehicle driving through potholes — issue still present.",
        "attribution": "KEmel49",
        "license": "CC BY-SA 4.0",
    },
    "manhole_before": {
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Old_Manhole_cover_in_India.jpg/960px-Old_Manhole_cover_in_India.jpg",
        "caption": "Old, damaged manhole cover in India.",
        "attribution": "Sindugab",
        "license": "CC0",
    },
    "manhole_after": {
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Manhole_cover_at_Charminar.jpg/960px-Manhole_cover_at_Charminar.jpg",
        "caption": "Manhole cover in place at a street market, Hyderabad.",
        "attribution": "Kasyap",
        "license": "CC0",
    },
    "garbage_main": {
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/India_-_Bombay_-_31_-_garbage_dump_%282799575380%29.jpg/960px-India_-_Bombay_-_31_-_garbage_dump_%282799575380%29.jpg",
        "caption": "Garbage accumulation near a city dump site.",
        "attribution": "McKay Savage",
        "license": "CC BY 2.0",
    },
    "garbage_evidence": {
        "url": "https://commons.wikimedia.org/wiki/Special:FilePath/City_Garbage_Dump_-_Dhapa_-_Kolkata_2010-08-06_7017.JPG?width=960",
        "caption": "Garbage still visible at a city waste collection point.",
        "attribution": "Biswarup Ganguly",
        "license": "CC BY-SA 3.0",
    },
}

DEMO_ISSUES = [
    {
        "reference": "CW-101",
        "title": "Large pothole on Ward 24 main road",
        "description": "Large pothole reported by citizens and creating difficulty for two-wheelers.",
        "category": "pothole",
        "category_key": "roads",
        "ward": "Ward 24",
        "locality": None,
        "city": "Nagpur",
        "latitude": 21.1598,
        "longitude": 79.0932,
        "status": "AUTHORITY_NOTIFIED",
        "trust_state": "CONFLICTING",
        "confirmations": 12,
        "comments_count": 5,
        "reported_at": NOW - timedelta(hours=36),
        "notified_at": NOW - timedelta(hours=30),
        "sla_exceeded": True,
        "verdict": "STILL_EXISTS",
        "verdict_note": "Latest citizen photo confirms the pothole still exists on the road.",
        "main_image": CIVIC_IMAGES["pothole_main"],
        "evidence": [
            {"kind": "citizen_confirm", "by_role": "citizen", "caption": "Vehicle driving through potholes."}
        ],
    },
    {
        "reference": "CW-102",
        "title": "Damaged manhole cover near bus stop",
        "description": "Damaged manhole cover near a bus stop became a risk for pedestrians and two-wheelers.",
        "category": "manhole",
        "category_key": "manholes",
        "ward": "Ward 18",
        "locality": None,
        "city": "Nagpur",
        "latitude": 21.1317,
        "longitude": 79.0712,
        "status": "MARKED_FIXED",
        "trust_state": "SUPPORTED",
        "confirmations": 8,
        "comments_count": 3,
        "reported_at": NOW - timedelta(days=2),
        "notified_at": NOW - timedelta(days=2),
        "sla_exceeded": False,
        "verdict": "FIXED",
        "verdict_note": "Latest verification photo supports the recorded fix.",
        "main_image": CIVIC_IMAGES["manhole_before"],
        "evidence": [
            {"kind": "completion", "by_role": "inspector", "caption": "Manhole sealed and cover replaced."},
            {"kind": "citizen_verify", "by_role": "citizen", "caption": "Manhole cover in place at street market."},
        ],
    },
    {
        "reference": "CW-103",
        "title": "Garbage accumulation at Local Market Road",
        "description": "Garbage has accumulated at the market road corner and is not being cleared.",
        "category": "garbage",
        "category_key": "garbage",
        "ward": None,
        "locality": "Local Market Road",
        "city": "Nagpur",
        "latitude": 21.1458,
        "longitude": 79.0882,
        "status": "AUTHORITY_NOTIFIED",
        "trust_state": "CONFLICTING",
        "confirmations": 21,
        "comments_count": 9,
        "reported_at": NOW - timedelta(days=3),
        "notified_at": NOW - timedelta(hours=60),
        "sla_exceeded": True,
        "verdict": None,
        "verdict_note": None,
        "main_image": CIVIC_IMAGES["garbage_main"],
        "evidence": [
            {"kind": "citizen_confirm", "by_role": "citizen", "caption": "Garbage still visible at collection point."}
        ],
    },
]

DEFAULT_ISSUE_IMAGES = {
    "pothole": ("pothole_main", "pothole_evidence"),
    "manhole": ("manhole_before", "manhole_after"),
    "garbage": ("garbage_main", "garbage_evidence"),
    "streetlight": ("pothole_main", None),
    "leakage": ("garbage_main", None),
    "drainage": ("garbage_main", None),
    "footpath": ("pothole_main", None),
    "other": ("garbage_main", None),
}


def seed_users(db) -> None:
    users = T["users"]
    for acc in DEMO_ACCOUNTS:
        exists = db.execute(select(users.c.id).where(users.c.email == acc["email"])).scalar_one_or_none()
        if exists:
            continue
        db.execute(
            users.insert().values(
                email=acc["email"],
                phone=acc["phone"],
                full_name=acc["full_name"],
                password_hash=hash_password(DEMO_PASSWORD),
                role=acc["role"],
                status="active",
                department_id=None,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        print(f"  + user {acc['email']} (role={acc['role']})")
    db.commit()


def seed_issues(db, citizen_id: int | None) -> None:
    civic = T["civic_issues"]
    for issue in DEMO_ISSUES:
        exists = db.execute(
            select(civic.c.id).where(civic.c.issue_reference == issue["reference"])
        ).scalar_one_or_none()
        if exists:
            continue
        main = issue["main_image"]
        evidence = []
        for e in issue["evidence"]:
            kind = e["kind"]
            img = CIVIC_IMAGES["pothole_evidence"]  # predictable image for confirm/verify snapshots
            if kind == "completion" and issue["reference"] == "CW-102":
                img = CIVIC_IMAGES["manhole_after"]
            elif kind == "citizen_verify":
                img = CIVIC_IMAGES["manhole_after"]
            elif kind == "citizen_confirm" and issue["reference"] == "CW-103":
                img = CIVIC_IMAGES["garbage_evidence"]
            evidence.append(
                {
                    "url": img["url"],
                    "caption": e["caption"],
                    "kind": kind,
                    "by_role": e["by_role"],
                    "attribution": img["attribution"],
                    "license": img["license"],
                    "at": issue["reported_at"].isoformat(),
                }
            )
        db.execute(
            civic.insert().values(
                issue_reference=issue["reference"],
                title=issue["title"],
                description=issue["description"],
                category=issue["category"],
                category_key=issue["category_key"],
                ward=issue["ward"],
                locality=issue["locality"],
                city=issue["city"],
                latitude=issue["latitude"],
                longitude=issue["longitude"],
                status=issue["status"],
                trust_state=issue["trust_state"],
                confirmations=issue["confirmations"],
                comments_count=issue["comments_count"],
                reported_by_id=citizen_id,
                reported_at=issue["reported_at"],
                notified_at=issue["notified_at"],
                target_hours=24,
                sla_exceeded=issue["sla_exceeded"],
                main_image_url=main["url"],
                main_image_caption=main["caption"],
                main_image_attribution=main["attribution"],
                main_image_license=main["license"],
                evidence=evidence,
                verdict=issue["verdict"],
                verdict_note=issue["verdict_note"],
                verified_by_id=(citizen_id if issue["verdict"] else None),
                verified_at=(issue["reported_at"] + timedelta(hours=12) if issue["verdict"] else None),
                created_at=issue["reported_at"],
                updated_at=issue["reported_at"],
            )
        )
        print(f"  + issue {issue['reference']} ({issue['status']})")
    db.commit()


def reset_civic(db) -> None:
    deleted = db.execute(delete(T["civic_issues"]))
    db.execute(delete(T["audit_logs"]).where(T["audit_logs"].c.entity_type == "civic_issue"))
    print(f"  - reset civic issues ({deleted.rowcount} deleted)")
    db.commit()


def main() -> None:
    reset = "--reset-civic" in sys.argv
    with SessionLocal() as db:
        if reset:
            reset_civic(db)
        seed_users(db)
        citizen_id = db.execute(
            select(T["users"].c.id).where(T["users"].c.email == "citizen@janverify.demo")
        ).scalar_one_or_none()
        seed_issues(db, citizen_id)
    print("seed_civic_demo: done.")


if __name__ == "__main__":
    main()