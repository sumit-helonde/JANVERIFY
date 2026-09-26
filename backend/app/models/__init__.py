"""Domain models for JANVERIFY (Phase 3 — database layer).

Importing this package has the side effect of importing *every* table module,
which populates ``Base.metadata`` — this is what Alembic's ``env.py`` uses as
the ORM-side database right hand (``target_metadata``) and what
``Base.metadata.create_all`` relies on in tests.

Avoid importing individual classes in the app layer; touch only declarative
classes re-exported here for stable, versioned imports.
"""

# Import order matters only for readability, not mapper configuration:
# relationships are resolved lazily by mapper ``configuration()`` at first
# registry use, so any import order works.
from app.models import (
    anomalies,
    audit_logs,
    budgets,
    citizen_reports,
    civic_issues,
    claims,
    contracts,
    decisions,
    departments,
    documents,
    evidence,
    inspections,
    mixin,  # noqa: F401  (TimestampMixin base for the rest)
    payments,
    progress_reports,
    project_categories,
    project_locations,
    project_relationships,
    projects,
    tenders,
    users,
    vendors,
)
