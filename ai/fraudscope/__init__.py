"""FRAUDSCOPE — financial anomaly detection module (implemented in Phase 10).

Phase 10 implementation: `backend/app/services/fraudscope.py`, served by
`GET /projects/{id}/fraudscope` and linked into the Evidence Graph as
FINANCIAL_ANOMALY nodes (`FLAGGED` edges). Rendered by the frontend
FraudScopePanel.

Detects anomalies such as missing payment support, duplicate invoice
indicators, contract/payment mismatch, unusual timing, milestone/payment
mismatch, expenditure/progress mismatch, missing documents, document
inconsistencies, and supported related-party indicators.

FRAUDSCOPE only flags anomalies requiring human review. It NEVER automatically
declares fraud or corruption.
"""