"""TRUSTMESH — evidence trust evaluation engine (implemented in Phase 8).

Phase 8 implementation: `backend/app/services/trustmesh.py`, served by
`GET /projects/{id}/decision` and rendered by the frontend TrustMeshPanel
("WHY this decision?" panel).

States:
    SUPPORTED
    INCOMPLETE
    CONFLICTING
    QUESTIONABLE
    HUMAN_REVIEW_REQUIRED
    INSUFFICIENT

TRUSTMESH never declares fraud or corruption. Every decision stays explainable:
claim, decision, reason, supporting/conflicting evidence, missing information,
sources, dates, and confidence context.

No implementation in Phase 0.
"""