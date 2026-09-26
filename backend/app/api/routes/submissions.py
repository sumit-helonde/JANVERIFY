"""POST endpoints: verify request, evidence, inspections, citizen reports.

Validated persistence against the existing schema. Citizen submissions stay
CITIZEN-SUBMITTED / PENDING_REVIEW — never auto-supported or verified.
"""

from __future__ import annotations

from datetime import datetime, timezone, date
from hashlib import sha256
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile, File, Form, UploadFile
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select

from app.core.db import get_session
from app.api.routes._db import T
from app.api.routes.auth import get_current_user, require_roles
from app.services.trustmesh import evaluate
from app.services.audit import record_audit

router = APIRouter(prefix="/api", tags=["submissions"])

NOW = datetime.now(timezone.utc)


def _project_exists(db, project_id):
    if not db.execute(
        select(T["projects"].c.id).where(T["projects"].c.id == project_id)
    ).scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")


class VerifyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    note: Optional[str] = Field(default=None, max_length=2000)


class EvidenceCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    project_id: int
    description: str = Field(min_length=3, max_length=2000)
    source_type: str = Field(pattern="^(citizen_photo|citizen_report|document|inspection|claim|decision)$")
    checksum_sha256: Optional[str] = Field(default=None, min_length=64, max_length=64)
    captured_at: Optional[datetime] = None


class InspectionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    project_id: int
    inspection_reference: str = Field(min_length=3, max_length=48)
    inspection_type: str = Field(
        pattern="^(pre_construction|materials_sampling|site_inspection|completion_review|defect_liability_review|special_audit)$"
    )
    outcome: str = Field(pattern="^(passed|passed_with_recommendations|failed|aborted)$")
    findings: Optional[str] = Field(default=None, max_length=6000)
    conducted_at: Optional[datetime] = None
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    contractor_id: Optional[int] = None


class CitizenReportCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    project_id: int
    report_type: str = Field(pattern="^(photo|document|complaint|observation|verify_request)$")
    description: str = Field(min_length=3, max_length=4000)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)


@router.post("/projects/{project_id}/verify", status_code=201)
async def create_verify_request(project_id: int, body: VerifyRequest, db=Depends(get_session)):
    _project_exists(db, project_id)
    cnt = db.execute(select(T["claims"].c.id)).scalars().all()
    ref = f"VER-{project_id:06d}-{len(cnt) + 1}"
    t = T["claims"]
    db.execute(t.insert().values(
        claim_reference=ref,
        project_id=project_id,
        claim_type="verification_request",
        description=body.note or f"Verification request submitted for project {project_id}.",
        claimed_amount=None,
        claimed_date=NOW,
        status="under_review",
        created_at=NOW,
        updated_at=NOW,
    ))
    db.commit()
    return {"reference": ref, "status": "under_review", "message": "Verification request recorded."}


@router.post("/evidence", status_code=201)
async def create_evidence(body: EvidenceCreate, db=Depends(get_session)):
    _project_exists(db, body.project_id)
    t = T["evidence"]
    if body.checksum_sha256 and db.execute(
        select(t.c.id).where(t.c.checksum_sha256 == body.checksum_sha256)
    ).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Evidence with this checksum already exists")
    db.execute(t.insert().values(
        project_id=body.project_id,
        uploaded_by_id=None,
        document_id=None,
        claim_id=None,
        captured_at=body.captured_at or NOW,
        description=body.description,
        source_type=body.source_type,
        status="pending",
        checksum_sha256=body.checksum_sha256,
        created_at=NOW,
        updated_at=NOW,
    ))
    db.commit()
    return {"message": "Evidence recorded.", "status": "pending", "review": "pending_review"}


@router.post("/inspections", status_code=201)
async def create_inspection(body: InspectionCreate, user=Depends(require_roles("inspector", "reviewer")), db=Depends(get_session)):
    _project_exists(db, body.project_id)
    t = T["inspections"]
    if db.execute(select(t.c.id).where(t.c.inspection_reference == body.inspection_reference)).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Inspection reference already exists")
    db.execute(t.insert().values(
        inspection_reference=body.inspection_reference,
        project_id=body.project_id,
        inspector_id=None,
        contractor_id=body.contractor_id,
        scheduled_date=None,
        conducted_at=body.conducted_at or NOW,
        latitude=body.latitude,
        longitude=body.longitude,
        findings=body.findings,
        inspection_type=body.inspection_type,
        outcome=body.outcome,
        report_document_id=None,
        created_at=NOW,
        updated_at=NOW,
    ))
    db.commit()
    return {"message": "Inspection recorded.", "inspection_reference": body.inspection_reference}


CITIZEN_CATEGORIES = {
    "Road", "Bridge", "School", "Hospital", "Water Plant",
    "Water Supply", "Public Building", "Other Infrastructure",
}


@router.post("/citizen-reports", status_code=201)
async def create_citizen_report(
    project_reference: str = Form(...),
    description: str = Form(min_length=3),
    category: str = Form("Other Infrastructure"),
    latitude: str = Form(""),
    longitude: str = Form(""),
    synthetic: str = Form("true"),
    photo: Optional[UploadFile] = File(default=None),
    user=Depends(get_current_user),
    db=Depends(get_session),
):
    """Citizen evidence submission. Stored as CITIZEN-SUBMITTED / PENDING_REVIEW.

    Citizen submissions are never automatically supported or verified. They enter a
    human review queue and appear separately from verified official evidence.
    """
    if category not in CITIZEN_CATEGORIES:
        raise HTTPException(status_code=422, detail="Unknown category")

    lat = None
    lng = None
    if latitude or longitude:
        try:
            lat = float(latitude)
            lng = float(longitude) if longitude else None
        except (TypeError, ValueError):
            raise HTTPException(status_code=422, detail="Invalid GPS coordinates")
        if lat is not None and not (-90 <= lat <= 90):
            raise HTTPException(status_code=422, detail="Invalid GPS coordinates")
        if lng is not None and not (-180 <= lng <= 180):
            raise HTTPException(status_code=422, detail="Invalid GPS coordinates")

    project = _resolve_project(db, project_reference)
    project_id = project["id"]
    is_synthetic = synthetic.lower() in ("true", "1", "yes")

    try:
        t_reports = T["citizen_reports"]
        report_type = "photo" if photo is not None and photo.filename else "observation"

        photo_doc_ids: list[int] = []
        if photo is not None and photo.filename:
            meta = _store_file(photo, "photo")
            title = f"Synthetic citizen photo ({project['reference_number']})" if is_synthetic else f"Citizen photo ({project['reference_number']})"
            doc_id = _add_document(db, meta["storage_key"], dict(
                project_id=project_id,
                title=title + (SYNTHETIC_SUFFIX if is_synthetic else ""),
                document_type="proof",
                storage_key=meta["storage_key"],
                checksum_sha256=meta["checksum_sha256"],
                content_type=meta["content_type"],
                byte_size=meta["byte_size"],
                uploaded_at=NOW,
                visibility="public",
                created_at=NOW,
                updated_at=NOW,
            ))
            photo_doc_ids = [doc_id]

        cnt = db.execute(select(t_reports.c.id)).scalars().all()
        ref = f"CIT-{project_id:06d}-{len(cnt) + 1}"
        label = f" [SYNTHETIC HACKATHON DATA]" if is_synthetic else ""
        db.execute(t_reports.insert().values(
            report_reference=ref,
            project_id=project_id,
            department_id=None,
            reported_by_id=None,
            location_id=None,
            report_type=report_type,
            description=f"Category: {category}. {description}{label}",
            reported_at=NOW,
            # Column-level CHECK only allows submitted|under_review|verified|disputed|rejected|merged.
            # 'submitted' is the truthful unverified state; API maps it to
            # CITIZEN-SUBMITTED / PENDING_REVIEW (never auto-supported or verified).
            status="submitted",
            latitude=lat,
            longitude=lng,
            photo_document_ids=photo_doc_ids,
            claim_source_id=None,
            is_location_verified=False,
            created_at=NOW,
            updated_at=NOW,
        ))
        db.commit()
        report_id = db.execute(
            select(t_reports.c.id).where(t_reports.c.report_reference == ref)
        ).scalar_one()
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Citizen report could not be persisted")

    record_audit(db, actor_id=user["id"], action="citizen_submit", entity_type="citizen_report",
                 entity_id=report_id, before=None, after="submitted",
                 project_id=project_id, source_reference=f"REF={ref}")

    return {
        "message": "Your evidence has been submitted.",
        "reference": ref,
        "project_id": project_id,
        "project_reference": project["reference_number"],
        "status": "CITIZEN-SUBMITTED",
        "review_status": "PENDING_REVIEW",
        "automatically_supported": False,
        "verified": False,
    }


# --- Inspector evidence submission (Phase 11) ---------------------------------

_UPLOAD_DIR = Path(__file__).resolve().parents[2] / "data" / "uploads"
_PHOTO_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
_DOC_EXT = {".pdf", ".doc", ".docx", ".txt", ".csv"}
SYNTHETIC_SUFFIX = " [SYNTHETIC HACKATHON DATA]"


def _resolve_project(db, ref: str) -> dict:
    rows = db.execute(
        select(T["projects"]).where(
            (T["projects"].c.reference_number == ref)
            | (T["projects"].c.id == int(ref))
        ) if ref.isdigit() else select(T["projects"]).where(
            T["projects"].c.reference_number == ref
        )
    ).mappings().first()
    if rows is None:
        numeric = int(ref) if ref.isdigit() else None
        rows = db.execute(
            select(T["projects"]).where(T["projects"].c.id == numeric)
        ).mappings().first() if numeric else None
    if rows is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return rows


def _store_file(upload: UploadFile, kind: str) -> dict:
    ext = Path(upload.filename or "").suffix.lower()
    allowed = _PHOTO_EXT if kind == "photo" else _DOC_EXT
    if kind not in ("photo", "document") or ext not in allowed:
        raise HTTPException(status_code=422, detail=f"Unsupported file type for {kind}: {ext or 'unknown'}")
    if kind == "photo" and upload.content_type and not upload.content_type.startswith("image/"):
        raise HTTPException(status_code=422, detail="Unsupported photo file type")
    bytes_ = upload.file.read()
    digest = sha256(bytes_).hexdigest()
    _UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    rel = f"uploads/{digest}{ext}"
    dest = _UPLOAD_DIR / f"{digest}{ext}"
    if not dest.exists():
        dest.write_bytes(bytes_)
    return {
        "filename": upload.filename,
        "storage_key": rel,
        "checksum_sha256": digest,
        "content_type": upload.content_type or "application/octet-stream",
        "byte_size": len(bytes_),
    }


def _add_document(db, storage_key: str, values: dict) -> int:
    """Insert a document row, re-using the existing row when the content already exists."""
    existing = db.execute(
        select(T["documents"].c.id).where(T["documents"].c.storage_key == storage_key)
    ).scalar_one_or_none()
    if existing is not None:
        return existing
    res = db.execute(T["documents"].insert().returning(T["documents"].c.id).values(**values))
    return res.scalar_one()


@router.post("/inspector-submissions", status_code=201)
async def create_inspector_submission(
    project_reference: str = Form(...),
    inspection_date: str = Form(...),
    latitude: str = Form(...),
    longitude: str = Form(...),
    measured_progress: str = Form(...),
    remarks: str = Form(min_length=3),
    synthetic: str = Form("true"),
    photo: Optional[UploadFile] = File(default=None),
    document: Optional[UploadFile] = File(default=None),
    user=Depends(require_roles("inspector", "reviewer")),
    db=Depends(get_session),
):
    """Persist an inspector-submitted inspection + linked files, then re-run TRUSTMESH."""
    try:
        pct = float(measured_progress)
    except (TypeError, ValueError):
        raise HTTPException(status_code=422, detail="Invalid progress value")
    if pct < 0 or pct > 100:
        raise HTTPException(status_code=422, detail="Progress must be between 0 and 100")
    try:
        lat = float(latitude)
        lng = float(longitude)
    except (TypeError, ValueError):
        raise HTTPException(status_code=422, detail="Invalid GPS coordinates")
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        raise HTTPException(status_code=422, detail="Invalid GPS coordinates")
    try:
        conducted_at = date.fromisoformat(inspection_date)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid inspection date")

    project = _resolve_project(db, project_reference)
    project_id = project["id"]
    is_synthetic = synthetic.lower() in ("true", "1", "yes")

    try:
        t_docs = T["documents"]
        t_insp = T["inspections"]
        t_reports = T["progress_reports"]
        reflabel = f"IND-{project_id:06d}"

        doc_rows: list[dict] = []
        if photo is not None and photo.filename:
            meta = _store_file(photo, "photo")
            title = f"Synthetic inspection field photo ({reflabel})" if is_synthetic else f"Inspection field photo ({reflabel})"
            doc_rows.append({"type": "photo", "id": _add_document(db, meta["storage_key"], dict(
                project_id=project_id,
                title=title + (SYNTHETIC_SUFFIX if is_synthetic else ""),
                document_type="proof",
                storage_key=meta["storage_key"],
                checksum_sha256=meta["checksum_sha256"],
                content_type=meta["content_type"],
                byte_size=meta["byte_size"],
                uploaded_at=NOW,
                visibility="public",
                created_at=NOW,
                updated_at=NOW,
            )), "checksum_sha256": meta["checksum_sha256"]})
        if document is not None and document.filename:
            meta = _store_file(document, "document")
            title = f"Synthetic inspection measurement record ({reflabel})" if is_synthetic else f"Inspection measurement record ({reflabel})"
            doc_rows.append({"type": "document", "id": _add_document(db, meta["storage_key"], dict(
                project_id=project_id,
                title=title + (SYNTHETIC_SUFFIX if is_synthetic else ""),
                document_type="report",
                storage_key=meta["storage_key"],
                checksum_sha256=meta["checksum_sha256"],
                content_type=meta["content_type"],
                byte_size=meta["byte_size"],
                uploaded_at=NOW,
                visibility="public",
                created_at=NOW,
                updated_at=NOW,
            )), "checksum_sha256": meta["checksum_sha256"]})

        report_doc_id = next((d["id"] for d in doc_rows if d["type"] == "document"), None)
        count = db.execute(select(t_insp.c.id)).scalars().all()
        insp_ref = f"SYN-INSP-{project_id:06d}-{len(count) + 1}"
        measured_fraction = round(pct / 100, 4)
        text = (
            f"Synthetic independent inspection for {project['reference_number']}: measured progress "
            f"{measured_fraction} in 0-1 scale ({pct:.2f}%). {remarks} (SYNTHETIC HACKATHON DATA)"
            if is_synthetic
            else (
                f"Independent inspection for {project['reference_number']}: measured progress "
                f"{measured_fraction} in 0-1 scale ({pct:.2f}%). {remarks}"
            )
        )
        db.execute(t_insp.insert().values(
            inspection_reference=insp_ref,
            project_id=project_id,
            inspector_id=None,
            contractor_id=None,
            scheduled_date=None,
            conducted_at=datetime.combine(conducted_at, datetime.min.time(), tzinfo=NOW.tzinfo),
            latitude=lat,
            longitude=lng,
            findings=text,
            inspection_type="site_inspection",
            outcome="passed",
            report_document_id=report_doc_id,
            created_at=NOW,
            updated_at=NOW,
        ))

        pr_count = db.execute(select(t_reports.c.id)).scalars().all()
        pr_ref = f"SYN-PR-{project_id:06d}-{len(pr_count) + 1}"
        db.execute(t_reports.insert().values(
            report_reference=pr_ref,
            project_id=project_id,
            contract_id=None,
            reporter_id=None,
            report_date=conducted_at,
            report_period="monthly",
            financial_progress=None,
            physical_progress=pct,
            verified_progress=pct,
            narrative=text,
            created_at=NOW,
            updated_at=NOW,
        ))

        for row in doc_rows:
            db.execute(T["evidence"].insert().values(
                project_id=project_id,
                uploaded_by_id=None,
                document_id=row["id"],
                claim_id=None,
                captured_at=NOW,
                description=f"Synthetic inspector evidence record {reflabel}."
                if is_synthetic else f"Inspector evidence record {reflabel}.",
                source_type="document",
                status="pending",
                checksum_sha256=row["checksum_sha256"],
                created_at=NOW,
                updated_at=NOW,
            ))

        db.commit()
        record_audit(db, actor_id=user["id"], action="create", entity_type="inspection",
                     entity_id=None, before=None, after=insp_ref,
                     project_id=project_id)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Inspection could not be persisted")

    decision = evaluate(project_id, db)
    return {
        "message": "Inspection evidence submitted successfully.",
        "project_id": project_id,
        "inspection_reference": insp_ref,
        "measured_progress": pct,
        "documents": doc_rows,
        "synthetic": is_synthetic,
        "trustmesh": {"state": decision["state"], "summary": decision["summary"]},
    }