"""Compare route: neutral, measurable filters and metrics. No rankings."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func

from app.core.db import get_session
from app.api.routes._db import T


router = APIRouter(prefix="/api", tags=["compare"])


def _pct(num, den):
    return round((num / den) * 100, 1) if den else 0.0


@router.get("/compare")
async def compare(
    city: str | None = Query(default=None),
    category: str | None = Query(default=None),
    department: str | None = Query(default=None),
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    db=Depends(get_session),
):
    p = T["projects"]
    c = T["project_categories"]
    d = T["departments"]

    rows = db.execute(
        select(p, c.c.name.label("category_name"), d.c.name.label("department_name"))
        .join(c, p.c.category_id == c.c.id, isouter=True)
        .join(d, p.c.department_id == d.c.id, isouter=True)
    ).mappings().all()

    budget_rows = db.execute(
        select(
            T["budgets"].c.project_id,
            func.sum(func.coalesce(T["budgets"].c.sanctioned_amount, 0)).label("sanctioned"),
            func.sum(func.coalesce(T["budgets"].c.allocated_amount, 0)).label("contract"),
            func.sum(func.coalesce(T["budgets"].c.released_amount, 0)).label("released"),
            func.sum(func.coalesce(T["budgets"].c.spent_amount, 0)).label("expenditure"),
        ).group_by(T["budgets"].c.project_id)
    ).mappings().all()
    funds = {b["project_id"]: b for b in budget_rows}

    ev_counts = dict(
        db.execute(
            select(T["evidence"].c.project_id, func.count())
            .group_by(T["evidence"].c.project_id)
        ).all()
    )
    insp_counts = dict(
        db.execute(
            select(T["inspections"].c.project_id, func.count())
            .group_by(T["inspections"].c.project_id)
        ).all()
    )

    if city:
        rows = [r for r in rows if (r["city"] or "").lower() == city.lower()]
    if category:
        rows = [r for r in rows if category.lower() in (r["category_name"] or "").lower()]
    if department:
        rows = [r for r in rows if department.lower() in (r["department_name"] or "").lower()]
    if from_date:
        rows = [r for r in rows if r["start_date"] and r["start_date"].date() >= from_date]
    if to_date:
        rows = [r for r in rows if r["start_date"] and r["start_date"].date() <= to_date]

    def project_metrics(r):
        b = funds.get(r["id"], {})
        delay_days = 0
        if r["actual_completion_date"] and r["expected_completion_date"]:
            delay_days = max((r["actual_completion_date"] - r["expected_completion_date"]).days, 0)
        return {
            "completed": 1 if r["status"] == "completed" else 0,
            "in_progress": 1 if r["status"] == "in_progress" else 0,
            "delayed": 1 if r["status"] == "delayed" else 0,
            "sanctioned": float(b.get("sanctioned", 0) or 0),
            "contract": float(b.get("contract", 0) or 0),
            "released": float(b.get("released", 0) or 0),
            "expenditure": float(b.get("expenditure", 0) or 0),
            "evidence": int(ev_counts.get(r["id"], 0)),
            "inspections": int(insp_counts.get(r["id"], 0)),
            "delay_days": delay_days,
        }

    groups = {
        "by_category": {"key": lambda r: r["category_name"] or "Uncategorized"},
        "by_department": {"key": lambda r: r["department_name"] or "Unassigned"},
    }
    all_metrics = [project_metrics(r) for r in rows]
    out = {}
    for label, g in groups.items():
        buckets = {}
        for r, m in zip(rows, all_metrics):
            k = g["key"](r)
            b = buckets.setdefault(k, {
                "projects": 0, "completed": 0, "in_progress": 0, "delayed": 0,
                "sanctioned": 0.0, "contract": 0.0, "released": 0.0, "expenditure": 0.0,
                "evidence_count": 0, "inspections": 0, "delay_days": 0,
                "with_evidence": 0, "with_inspections": 0,
            })
            b["projects"] += 1
            b["completed"] += m["completed"]
            b["in_progress"] += m["in_progress"]
            b["delayed"] += m["delayed"]
            b["sanctioned"] += m["sanctioned"]
            b["contract"] += m["contract"]
            b["released"] += m["released"]
            b["expenditure"] += m["expenditure"]
            b["evidence_count"] += m["evidence"]
            b["inspections"] += m["inspections"]
            b["delay_days"] += m["delay_days"]
            b["with_evidence"] += 1 if m["evidence"] > 0 else 0
            b["with_inspections"] += 1 if m["inspections"] > 0 else 0
        for k, b in buckets.items():
            b["evidence_completeness_pct"] = _pct(b["with_evidence"], b["projects"])
            b["inspection_coverage_pct"] = _pct(b["with_inspections"], b["projects"])
            b["average_delay_days"] = round(b["delay_days"] / b["delayed"], 1) if b["delayed"] else None
        out[label] = buckets

    summary = {
        "total_projects": len(rows),
        "completed": sum(m["completed"] for m in all_metrics),
        "in_progress": sum(m["in_progress"] for m in all_metrics),
        "delayed": sum(m["delayed"] for m in all_metrics),
        "sanctioned": round(sum(m["sanctioned"] for m in all_metrics), 2),
        "contract": round(sum(m["contract"] for m in all_metrics), 2),
        "released": round(sum(m["released"] for m in all_metrics), 2),
        "expenditure": round(sum(m["expenditure"] for m in all_metrics), 2),
        "evidence_count": sum(m["evidence"] for m in all_metrics),
        "inspection_count": sum(m["inspections"] for m in all_metrics),
        "evidence_completeness_pct": _pct(sum(1 for m in all_metrics if m["evidence"] > 0), len(rows)),
        "inspection_coverage_pct": _pct(sum(1 for m in all_metrics if m["inspections"] > 0), len(rows)),
        "average_delay_days": round(sum(m["delay_days"] for m in all_metrics) / sum(m["delayed"] for m in all_metrics), 1) if sum(m["delayed"] for m in all_metrics) else None,
    }

    all_rows = db.execute(
        select(p, c.c.name.label("category_name"), d.c.name.label("department_name"))
        .join(c, p.c.category_id == c.c.id, isouter=True)
        .join(d, p.c.department_id == d.c.id, isouter=True)
    ).mappings().all()

    return {
        "filters_applied": {
            "city": city, "category": category, "department": department,
            "from_date": from_date.isoformat() if from_date else None,
            "to_date": to_date.isoformat() if to_date else None,
        },
        "summary": summary,
        "by_category": out["by_category"],
        "by_department": out["by_department"],
        "filter_options": {
            "cities": sorted({r["city"] for r in all_rows if r["city"]}),
            "categories": sorted({r["category_name"] for r in all_rows if r["category_name"]}),
            "departments": sorted({r["department_name"] for r in all_rows if r["department_name"]}),
        },
        "metric_notes": {
            "evidence_completeness_pct": "Calculated from on-record project evidence for the selected period.",
            "inspection_coverage_pct": "Calculated from on-record independent inspection records for the selected period.",
            "average_delay_days": "Mean delay relative to expected completion, from completed/delayed records only.",
        },
    }