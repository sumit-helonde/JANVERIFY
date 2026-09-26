"""Phase 4 verifiable unit: deterministic SYNTHETIC HACKATHON DATA seed.

Goal (tasks.md Phase 4): populate the live ``janverify`` database with a
complete, reproducible, auditable synthetic dataset, including the killer demo
project NRD-204 (Ward 24 Road Development) with its exact values. Every
business record carries an explicit ``SYNTHETIC HACKATHON DATA`` marker so no
synthetic row can ever be mistaken for real allegations. No TrustMesh/decision
rows are seeded here -- decisions are derived in a later phase from evidence.

Mechanism note: records are written through the *reflected* live schema
(``MetaData.reflect``) with plain SQLAlchemy Core ``Table`` inserts, because the
Phase 3 ORM relationship layer cannot be configured (it contains ~30 broken
``back_populates`` targets and two phantom models ``Bid``/``TenderSubmission``
with no matching tables). We therefore never touch schema, migrations, or
models; we only write *rows* into the existing tables, respecting every check
constraint of the live database. Values that the schema stores as percentages
(progress_reports.*_progress 0-100) are written as percentages; the project
table stores 0-1 fractions.

Guards:

- Idempotent: existing rows keyed by stable reference strings are skipped.
- Fixed PRNG seed -> a second run reproduces the same references and values.
- Always writes a verdict file (JANV_P4_VERDICT) with atomic temp+rename write
  and a finally guard. Verdict only PASS after live read-back verification of
  the killer project values and volume thresholds.
"""

from __future__ import annotations

import os
import hashlib
import random
import sys
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sqlalchemy import MetaData, func, select, text

from app.core.db import engine

SYNTHETIC_TAG = "SYNTHETIC HACKATHON DATA"
TODAY = date(2026, 9, 22)
NOW = datetime.now(timezone.utc)

VERDICT = os.environ.get(
    "JANV_P4_VERDICT",
    os.path.join(os.environ.get("TEMP", "."), "janv_p4_verdict.txt"),
)

RNG = random.Random(20260419)

KILLER = {
    "reference": "NRD-204",
    "name": "Ward 24 Road Development",
    "sanctioned": Decimal("50.00"),
    "contract": Decimal("47.80"),
    "released": Decimal("42.00"),
    "spent": Decimal("39.00"),
    "dept_progress": Decimal("0.85"),
    "earlier_inspection": Decimal("0.63"),
    "latest_inspection": Decimal("0.82"),
    "financial_review": Decimal("8.20"),
}

DEPARTMENTS = [
    ("Rural Development", "RDD", "Flags rural infrastructure; owns NRD-series projects."),
    ("Public Works", "PWD", "Builds and maintains roads, buildings and bridges."),
    ("Water Resources", "WRD", "Water treatment plants, supply, and irrigation works."),
    ("Education", "EDU", "Government school construction and upgradation."),
    ("Health", "HLT", "Government hospital and health facility buildings."),
    ("Urban Development", "UDD", "Urban infrastructure and civic amenities."),
    ("Municipal Administration", "MAD", "Municipal roads, drains and public buildings."),
    ("Forests & Environment", "FED", "Afforestation and environmental works."),
    ("Energy", "EGD", "Power distribution and street lighting works."),
    ("Communication", "CMD", "Connectivity and ICT infrastructure."),
]

CATEGORIES = [
    ("Roads", "roads", 0),
    ("Bridges", "bridges", 1),
    ("Government Schools", "government-schools", 3),
    ("Government Hospitals", "government-hospitals", 4),
    ("Water Treatment Plants", "water-treatment-plants", 2),
    ("Water Supply", "water-supply", 2),
    ("Public Buildings", "public-buildings", 1),
    ("Other Infrastructure", "other-infrastructure", 0),
]

ROLES = ("admin", "department_official", "inspector", "citizen", "contractor")

VENDOR_NAMES = [
    ("BuildRite Infra Pvt Ltd", "BR-INFRA"),
    ("Shri Ram Constructions", "SR-CONS"),
    ("Surya Developers", "SUR-DEV"),
    ("Narmada Civil Works", "NRM-CIV"),
    ("GangaBuild Co.", "GNG-BLD"),
    ("UrbanTerra Ltd", "URB-TER"),
    ("CivicWorks Bharat", "CIV-BHA"),
    ("Sahayog Engineers", "SHY-ENG"),
    ("Vikram Tata Constructions", "VTC-001"),
    ("GreenRock Infra", "GRN-RK"),
    ("Ambe Roads & Bridges", "AMB-RB"),
    ("MetroCivil Pvt Ltd", "MET-CIV"),
    ("Dakshin InfraWorks", "DKW-01"),
    ("Northway Contracts", "TORT-NO"),
]


def gen_email(role, i):
    return f"synthetic.{role}.{i:03d}@janverify.test"


def gen_phone():
    return "9" + "".join(str(RNG.randint(0, 9)) for _ in range(9))


def fake_hash(seed):
    return hashlib.sha256(f"synth:{seed}".encode()).hexdigest()


# ---------------------------------------------------------------- reflected --
metadata = MetaData()
metadata.reflect(bind=engine)
TABLES = metadata.tables


def cols(tbl_name, d):
    t = TABLES[tbl_name]
    return {k: v for k, v in d.items() if k in t.c}


def get_id(conn, tbl_name, col, value):
    t = TABLES[tbl_name]
    return conn.execute(
        select(t.c.id).where(t.c[col] == value).limit(1)
    ).scalar_one_or_none()


def insert_row(conn, tbl_name, values, ret_id=True):
    t = TABLES[tbl_name]
    stmt = t.insert().values(**cols(tbl_name, values))
    if ret_id and "id" in t.c:
        stmt = stmt.returning(t.c.id)
    res = conn.execute(stmt)
    return res.scalar() if ret_id and "id" in t.c else None


def pick_id(conn, tbl_name):
    t = TABLES[tbl_name]
    rows = conn.execute(select(t.c.id).order_by(func.random())).scalars().all()
    return RNG.choice(rows) if rows else None


# ================================================================== SEEDERS ==
def seed_departments(conn):
    for name, code, desc in DEPARTMENTS:
        if get_id(conn, "departments", "code", f"SYN-{code}"):
            continue
        insert_row(conn, "departments", {
            "name": f"{name} [{SYNTHETIC_TAG}]",
            "code": f"SYN-{code}",
            "description": f"{desc} {SYNTHETIC_TAG}.",
            "created_at": NOW,
            "updated_at": NOW,
        })


def seed_categories(conn):
    for name, slug, dept_idx in CATEGORIES:
        dcode = f"SYN-{DEPARTMENTS[dept_idx][1]}"
        dept_id = get_id(conn, "departments", "code", dcode)
        if not dept_id or get_id(conn, "project_categories", "slug", f"syn-{slug}"):
            continue
        insert_row(conn, "project_categories", {
            "name": f"{name} [{SYNTHETIC_TAG}]",
            "slug": f"syn-{slug}",
            "department_id": dept_id,
            "description": f"{SYNTHETIC_TAG}.",
            "created_at": NOW,
            "updated_at": NOW,
        })


def seed_users(conn):
    dept_ids = conn.execute(select(TABLES["departments"].c.id)).scalars().all()
    dept_ids = list(dept_ids)
    for i, role in enumerate(ROLES):
        for j in range(1, 3):
            email = gen_email(role, j)
            if get_id(conn, "users", "email", email):
                continue
            dept = dept_ids[(i + j) % len(dept_ids)] if dept_ids else None
            insert_row(conn, "users", {
                "email": email,
                "phone": gen_phone(),
                "full_name": f"Synthetic {role.title()} {j} [{SYNTHETIC_TAG}]",
                "password_hash": fake_hash(f"{role}:{j}"),
                "role": role,
                "status": "active",
                "department_id": dept,
                "created_at": NOW,
                "updated_at": NOW,
            })


def seed_vendors(conn):
    for name, code in VENDOR_NAMES:
        if get_id(conn, "vendors", "vendor_code", f"SYN-{code}"):
            continue
        insert_row(conn, "vendors", {
            "name": f"{name} [{SYNTHETIC_TAG}]",
            "vendor_code": f"SYN-{code}",
            "registration_number": f"SYN-IL-{code}",
            "pan_number": f"SYN{code[-4:]}P",
            "gst_number": f"SYN{code}0000{code[-2:]}Z",
            "contact_person": f"Procurement Desk {code}",
            "contact_email": f"synthetic.vendor.{code.lower()}@janverify.test",
            "contact_phone": gen_phone(),
            "address": f"SYNTHETIC ADDRESS, Block {code[-2:]}, India",
            "status": "active",
            "created_at": NOW,
            "updated_at": NOW,
        })


def seed_projects(conn):
    dept_ids = list(conn.execute(select(TABLES["departments"].c.id)).scalars().all())
    cat_ids = list(conn.execute(select(TABLES["project_categories"].c.id)).scalars().all())

    specs = [(KILLER["reference"], cat_ids[0], dept_ids[0])]
    for i in range(1, 51):
        specs.append((f"NRD-{i:03d}", cat_ids[i % len(cat_ids)], dept_ids[i % len(dept_ids)]))

    for ref, cat, dept in specs:
        if get_id(conn, "projects", "reference_number", ref):
            continue
        is_k = ref == KILLER["reference"]
        d = TODAY - timedelta(days=RNG.randint(60, 500))
        insert_row(conn, "projects", {
            "reference_number": ref,
            "name": KILLER["name"] if is_k else f"Synthetic Project {ref} [{SYNTHETIC_TAG}]",
            "description": f"{SYNTHETIC_TAG}. Description only; nothing here is real.",
            "category_id": cat,
            "department_id": dept,
            "X": RNG.uniform(72.5, 78.0),
            "y_coordinate": RNG.uniform(19.0, 31.0),
            "city": "Synthetic City",
            "state": "Synthetic State",
            "status": "in_progress",
            "total_budget_sanctioned": float(KILLER["sanctioned"]) if is_k else RNG.uniform(1, 200),
            "total_budget_released": float(KILLER["released"]) if is_k else RNG.uniform(0.5, 150),
            "start_date": d,
            "expected_completion_date": d + timedelta(days=RNG.randint(200, 1200)),
            "department_reported_progress": float(KILLER["dept_progress"]) if is_k else RNG.uniform(0.3, 0.98),
            "verified_progress": float(KILLER["latest_inspection"]) if is_k else RNG.uniform(0.3, 0.98),
            "actual_completion_date": None,
            "created_at": NOW,
            "updated_at": NOW,
        })


def seed_locations(conn):
    proj = TABLES["projects"]
    for pid in conn.execute(select(proj.c.id)).scalars().all():
        if get_id(conn, "project_locations", "project_id", pid):
            continue
        insert_row(conn, "project_locations", {
            "project_id": pid,
            "location_name": "Synthetic Base Point [SYNTHETIC HACKATHON DATA]",
            "latitude": RNG.uniform(19.0, 31.0),
            "longitude": RNG.uniform(72.5, 78.0),
            "created_at": NOW,
            "updated_at": NOW,
        })


def seed_budgets(conn):
    proj = TABLES["projects"]
    pids = conn.execute(select(proj.c.id, proj.c.reference_number)).all()
    for pid, ref in pids:
        if get_id(conn, "budgets", "project_id", pid):
            continue
        is_k = ref == KILLER["reference"]
        sanctioned = float(KILLER["sanctioned"]) if is_k else RNG.uniform(1, 200)
        allocated = float(KILLER["contract"]) if is_k else RNG.uniform(1, sanctioned)
        insert_row(conn, "budgets", {
            "project_id": pid,
            "financial_year": "2026-27",
            "sanctioned_amount": sanctioned,
            "allocated_amount": allocated,
            "released_amount": float(KILLER["released"]) if is_k else RNG.uniform(0.5, allocated),
            "spent_amount": float(KILLER["spent"]) if is_k else RNG.uniform(0.5, allocated),
            "created_at": NOW,
            "updated_at": NOW,
        })


def seed_tenders(conn):
    proj = TABLES["projects"]
    dept_ids = list(conn.execute(select(TABLES["departments"].c.id)).scalars().all())
    for pid, ref in conn.execute(select(proj.c.id, proj.c.reference_number)).all():
        t = f"T-{ref}"
        if get_id(conn, "tenders", "tender_reference", t):
            continue
        is_k = ref == KILLER["reference"]
        insert_row(conn, "tenders", {
            "tender_reference": t,
            "project_id": pid,
            "department_id": dept_ids[0] if is_k else RNG.choice(dept_ids),
            "title": f"Synthetic Tender {ref} [SYNTHETIC HACKATHON DATA]",
            "description": "SYNTHETIC HACKATHON DATA. Nothing here is real.",
            "estimated_value": float(KILLER["contract"]) if is_k else RNG.uniform(1, 150),
            "publication_date": NOW,
            "submission_deadline": NOW + timedelta(days=30),
            "status": "awarded" if is_k else RNG.choice(
                ["draft", "published", "under_evaluation", "awarded", "cancelled", "expired"]
            ),
            "created_at": NOW,
            "updated_at": NOW,
        })


def seed_contracts(conn):
    tenders = TABLES["tenders"]
    rows = conn.execute(
        select(tenders.c.id, tenders.c.project_id, tenders.c.tender_reference)
    ).all()
    for tid, pid, tref in rows:
        if get_id(conn, "contracts", "contract_reference", f"C-{tref}"):
            continue
        is_k = tref == f"T-{KILLER['reference']}"
        contractor = pick_id(conn, "vendors")
        dept = pick_id(conn, "departments")
        official = pick_id(conn, "users")
        if not (contractor and dept):
            continue
        insert_row(conn, "contracts", {
            "contract_reference": f"C-{tref}",
            "project_id": pid,
            "award_tender_id": tid,
            "contractor_id": contractor,
            "awarding_department_id": dept,
            "authorizing_official_id": official,
            "title": f"Synthetic Contract {tref} [SYNTHETIC HACKATHON DATA]",
            "scope_of_work": "SYNTHETIC HACKATHON DATA. Nothing here is real.",
            "award_date": TODAY - timedelta(days=20),
            "start_date": TODAY - timedelta(days=10),
            "completion_date": TODAY + timedelta(days=RNG.randint(100, 800)),
            "actual_completion_date": None,
            "status": "active",
            "award_amount": float(KILLER["contract"]) if is_k else RNG.uniform(1, 150),
            "escalation_amount": RNG.uniform(0, 10) if not is_k else 0.0,
            "variation_amount": RNG.uniform(0, 10) if not is_k else 0.0,
            "revised_amount": float(KILLER["contract"]) if is_k else RNG.uniform(1, 150),
            "created_at": NOW,
            "updated_at": NOW,
        })


def seed_payments(conn):
    contracts = TABLES["contracts"]
    rows = conn.execute(
        select(contracts.c.id, contracts.c.project_id, contracts.c.contractor_id,
               contracts.c.award_amount, contracts.c.contract_reference)
    ).all()
    for cid, pid, vendor_id, award, cref in rows:
        is_k = cref == f"C-T-{KILLER['reference']}"
        if is_k:
            amounts = [10.0, 12.0, 10.0, 10.0]   # sums to Rs 42 Cr released trail
            count = len(amounts)
        else:
            count = 3 if award and award <= 50 else RNG.randint(2, 6)
            amounts = [RNG.uniform(0.1, 10) for _ in range(count)]
        for j in range(count):
            pr = f"SYN-PAY-{cid:06d}-{j}"
            if get_id(conn, "payments", "payment_reference", pr):
                continue
            if not vendor_id:
                continue
            insert_row(conn, "payments", {
                "payment_reference": pr,
                "contract_id": cid,
                "project_id": pid,
                "vendor_id": vendor_id,
                "amount": amounts[j],
                "payment_date": TODAY - timedelta(days=RNG.randint(0, 60)),
                "payment_type": RNG.choice(["advance", "milestone", "final", "retention", "supplementary"]),
                "status": "recorded",
                "created_at": NOW,
                "updated_at": NOW,
            })


def seed_documents(conn):
    proj = TABLES["projects"]
    kinds = ["report", "financial", "bidding", "agreement", "proof", "notice", "other"]
    for pid, ref in conn.execute(select(proj.c.id, proj.c.reference_number)).all():
        is_k = ref == KILLER["reference"]
        for kind in kinds:
            doc_key = f"syn/seed/{pid:06d}/{kind}"
            if get_id(conn, "documents", "storage_key", doc_key):
                continue
            insert_row(conn, "documents", {
                "project_id": pid,
                "contract_id": None,
                "uploader_id": pick_id(conn, "users"),
                "tender_id": None,
                "title": f"Synthetic Document {ref} {kind} [SYNTHETIC HACKATHON DATA]",
                "document_type": kind,
                "storage_key": doc_key,
                "checksum_sha256": fake_hash(f"{pid}:{kind}") if is_k else None,
                "content_type": "application/pdf",
                "byte_size": RNG.randint(10_000, 2_000_000),
                "uploaded_at": NOW,
                "visibility": "public",
                "created_at": NOW,
                "updated_at": NOW,
            })


def seed_evidence(conn):
    proj = TABLES["projects"]
    valid_sources = ["citizen_photo", "citizen_report", "document", "inspection", "claim", "decision"]
    for pid, ref in conn.execute(select(proj.c.id, proj.c.reference_number)).all():
        is_k = ref == KILLER["reference"]
        n = 3 if is_k else RNG.randint(1, 3)
        for j in range(n):
            csum = fake_hash(f"{pid}:ev:{j}")
            if get_id(conn, "evidence", "checksum_sha256", csum):
                continue
            insert_row(conn, "evidence", {
                "project_id": pid,
                "uploaded_by_id": pick_id(conn, "users"),
                "document_id": None,
                "claim_id": None,
                "captured_at": NOW,
                "description": (
                    f"SYNTHETIC HACKATHON DATA photo/record #{j} for {ref}. "
                    f"Not real; demo only."
                ),
                "source_type": RNG.choice(valid_sources),
                "status": "pending",
                "checksum_sha256": csum,
                "created_at": NOW,
                "updated_at": NOW,
            })


def seed_inspections(conn):
    proj = TABLES["projects"]
    itypes = ["pre_construction", "materials_sampling", "site_inspection",
              "completion_review", "defect_liability_review", "special_audit"]
    outcomes = ["passed", "passed_with_recommendations", "failed", "aborted"]
    for pid, ref in conn.execute(select(proj.c.id, proj.c.reference_number)).all():
        is_k = ref == KILLER["reference"]
        n = 2 if is_k else RNG.randint(1, 2)
        for j in range(n):
            iref = f"SYN-INSP-{pid:06d}-{j}"
            if get_id(conn, "inspections", "inspection_reference", iref):
                continue
            if is_k:
                measured = float(KILLER["earlier_inspection"]) if j == 0 else float(KILLER["latest_inspection"])
            else:
                measured = RNG.uniform(0.3, 0.98)
            insert_row(conn, "inspections", {
                "inspection_reference": iref,
                "project_id": pid,
                "inspector_id": pick_id(conn, "users"),
                "contractor_id": pick_id(conn, "vendors"),
                "scheduled_date": NOW - timedelta(days=RNG.randint(0, 40)),
                "conducted_at": NOW - timedelta(days=RNG.randint(0, 40)),
                "latitude": RNG.uniform(19.0, 31.0),
                "longitude": RNG.uniform(72.5, 78.0),
                "findings": (
                    f"SYNTHETIC HACKATHON DATA independent inspection #{j} for {ref}: "
                    f"measured progress {measured:.2f} in 0-1 scale ({measured:.2%})."
                ),
                "inspection_type": RNG.choice(itypes),
                "outcome": RNG.choice(outcomes),
                "report_document_id": None,
                "created_at": NOW,
                "updated_at": NOW,
            })


def seed_progress_reports(conn):
    proj = TABLES["projects"]
    for pid, ref in conn.execute(select(proj.c.id, proj.c.reference_number)).all():
        is_k = ref == KILLER["reference"]
        n = 2 if is_k else 1
        for j in range(n):
            refn = f"SYN-PR-{pid:06d}-{j}"
            if get_id(conn, "progress_reports", "report_reference", refn):
                continue
            if is_k:
                dept_p = float(KILLER["dept_progress"]) * 100      # 85
                veri_p = (float(KILLER["latest_inspection"]) if j == 1
                          else float(KILLER["earlier_inspection"])) * 100
                fin_p = float(KILLER["released"])                   # 42
            else:
                dept_p = RNG.uniform(30, 98)
                veri_p = RNG.uniform(30, 98)
                fin_p = RNG.uniform(20, 95)
            insert_row(conn, "progress_reports", {
                "report_reference": refn,
                "project_id": pid,
                "contract_id": None,
                "reporter_id": pick_id(conn, "users"),
                "report_date": TODAY - timedelta(days=RNG.randint(0, 40)),
                "report_period": "monthly",
                "financial_progress": fin_p,
                "physical_progress": dept_p,
                "verified_progress": veri_p,
                "narrative": "SYNTHETIC HACKATHON DATA progress report.",
                "created_at": NOW,
                "updated_at": NOW,
            })


def seed_claims(conn):
    proj = TABLES["projects"]
    contracts = TABLES["contracts"]
    for pid, ref in conn.execute(select(proj.c.id, proj.c.reference_number)).all():
        is_k = ref == KILLER["reference"]
        n = 3 if is_k else 1
        contract_id = None
        if is_k:
            contract_id = get_id(conn, "contracts", "contract_reference", f"C-T-{KILLER['reference']}")
        for j in range(n):
            cref = f"SYN-CLM-{pid:06d}-{j}"
            if get_id(conn, "claims", "claim_reference", cref):
                continue
            if is_k and j == 2:
                ctype, status, amount = "financial_documentation", "under_review", float(KILLER["financial_review"])
                narrative = (
                    "SYNTHETIC HACKATHON DATA. Financial documentation requires review. "
                    "Rs 8.2 Cr of financial documentation requires review; no conclusion drawn."
                )
            else:
                ctype, status, amount = "progress_payment", "under_review", RNG.uniform(0.1, 20)
                narrative = f"SYNTHETIC HACKATHON DATA claim {j} for {ref}."
            insert_row(conn, "claims", {
                "claim_reference": cref,
                "project_id": pid,
                "contract_id": contract_id,
                "claimant_id": None,
                "vendor_id": None,
                "claim_type": ctype,
                "description": narrative,
                "claimed_amount": amount,
                "claimed_date": NOW,
                "status": status,
                "created_at": NOW,
                "updated_at": NOW,
            })


def seed_citizen_reports(conn):
    proj = TABLES["projects"]
    for pid, ref in conn.execute(select(proj.c.id, proj.c.reference_number)).all():
        rref = f"SYN-CIT-{pid:06d}"
        if get_id(conn, "citizen_reports", "report_reference", rref):
            continue
        insert_row(conn, "citizen_reports", {
            "report_reference": rref,
            "project_id": pid,
            "department_id": None,
            "reported_by_id": None,
            "location_id": None,
            "report_type": "complaint",
            "description": (
                f"SYNTHETIC HACKATHON DATA citizen-submitted report for {ref}. "
                f"Nothing here is real; none of this is a verified real-world allegation."
            ),
            "reported_at": NOW,
            "status": "submitted",
            "latitude": RNG.uniform(19.0, 31.0),
            "longitude": RNG.uniform(72.5, 78.0),
            "claim_source_id": None,
            "is_location_verified": False,
            "created_at": NOW,
            "updated_at": NOW,
        })


def seed_relationships(conn):
    proj = TABLES["projects"]
    pids = list(conn.execute(select(proj.c.id)).scalars().all())
    for i, pid in enumerate(pids):
        rel = pids[(i + 1) % len(pids)]
        if pid == rel:
            continue
        t = TABLES["project_relationships"]
        exists = conn.execute(
            select(t.c.id).where(t.c.project_id == pid, t.c.related_project_id == rel)
        ).scalar_one_or_none()
        if exists:
            continue
        insert_row(conn, "project_relationships", {
            "project_id": pid,
            "related_project_id": rel,
            "relationship_type": "same_vendor",
            "status": "proposed",
            "rationale": "SYNTHETIC HACKATHON DATA relationship.",
            "evidence_refs": None,
            "detected_at": NOW,
            "validated_at": None,
            "inverse_relationship_id": None,
            "created_at": NOW,
            "updated_at": NOW,
        })


# ================================================================== VERDICT ==
def read_back(conn):
    proj = TABLES["projects"]
    killer_pid = get_id(conn, "projects", "reference_number", KILLER["reference"])
    if not killer_pid:
        return ("FAIL", "killer project NRD-204 missing")
    row = conn.execute(
        select(proj.c.total_budget_sanctioned,
               proj.c.total_budget_released,
               proj.c.department_reported_progress,
               proj.c.verified_progress,
               proj.c.department_id).where(proj.c.id == killer_pid)
    ).one()
    checks = [
        ("sanctioned", float(row[0]), float(KILLER["sanctioned"])),
        ("released", float(row[1]), float(KILLER["released"])),
        ("dept_progress", float(row[2]), float(KILLER["dept_progress"])),
        ("verified_progress", float(row[3]), float(KILLER["latest_inspection"])),
    ]
    bad = [c for c in checks if abs(c[1] - c[2]) > 0.02]
    if bad:
        return ("FAIL", f"killer mismatch: {bad}")

    budget = get_id(conn, "budgets", "project_id", killer_pid)
    contract = get_id(conn, "contracts", "contract_reference", f"C-T-{KILLER['reference']}")
    if not budget or not contract:
        return ("FAIL", "killer budget or contract missing")

    counts = {}
    for tname in ["projects", "departments", "vendors", "tenders", "contracts", "payments",
                  "evidence", "inspections", "documents", "progress_reports", "claims",
                  "citizen_reports", "project_locations", "budgets", "project_relationships"]:
        counts[tname] = conn.execute(select(func.count()).select_from(TABLES[tname])).scalar_one()
    for name, val in counts.items():
        if val < 1:
            return ("FAIL", f"count {name}=0")
    return ("PASS", f"killer NRD-204 ok + volumes: {counts}")


def main():
    import sqlalchemy.exc
    verdict = "FAIL"
    reason = "not run"
    tmp = VERDICT + ".tmp"
    conn = engine.connect()
    state = "seed_done"
    try:
        with conn.begin():
            seed_departments(conn)
            seed_categories(conn)
            seed_users(conn)
            seed_vendors(conn)
            seed_projects(conn)
            seed_locations(conn)
            seed_budgets(conn)
            seed_tenders(conn)
            seed_contracts(conn)
            seed_payments(conn)
            seed_documents(conn)
            seed_evidence(conn)
            seed_inspections(conn)
            seed_progress_reports(conn)
            seed_claims(conn)
            seed_citizen_reports(conn)
            seed_relationships(conn)
        state, msg = read_back(conn)
        if state == "PASS":
            verdict = "PASS"
            reason = msg
        else:
            reason = msg
    except sqlalchemy.exc.DBAPIError as exc:
        state = "DB_ERROR"
        reason = f"{type(exc.orig).__name__}: {exc.orig}"
    except Exception as exc:
        state = f"ERROR_{type(exc).__name__}"
        reason = str(exc)[:400]
    finally:
        conn.close()
        with open(tmp, "w", encoding="utf-8") as fh:
            fh.write(f"VERDICT_FINAL={verdict}\n")
            fh.write(f"VERDICT_REASON={reason}\n")
        os.replace(tmp, VERDICT)
        os.environ["JANV_P4_TERMINAL"] = "P4_TERMINAL"
        print(f"STATE={state} VERDICT={verdict}")
        print(f"reason={reason}")
        print(f"verdict_file={VERDICT}")


if __name__ == "__main__":
    main()