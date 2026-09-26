import { AlertTriangle, Eye, FileSearch } from 'lucide-react'

import type { FraudscopeFinding } from '../../lib/api'

export interface FraudscopePanelData {
  status: string
  summary: string
  findings: FraudscopeFinding[]
}

interface FraudScopePanelProps extends FraudscopePanelData {
  onViewEvidence?: () => void
}

export default function FraudScopePanel({ status, summary, findings, onViewEvidence }: FraudScopePanelProps) {
  const reviewRequired = status === 'HUMAN_REVIEW_REQUIRED'
  return (
    <section
      aria-label="FRAUDSCOPE financial and procurement review"
      className="rounded-2xl border border-jv-border bg-white p-5 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-jv-navy">
          <FileSearch className="h-4 w-4 text-jv-blue" aria-hidden />
          Fraudscope
        </h3>
        <span
          className={
            reviewRequired
              ? 'inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700'
              : 'inline-flex items-center gap-1 rounded-full bg-jv-green/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-jv-green'
          }
        >
          <AlertTriangle className="h-3 w-3" aria-hidden />
          {reviewRequired ? 'Human review required' : status.replace(/_/g, ' ').toLowerCase()}
        </span>
      </div>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-jv-muted">
        Financial / Procurement Review
      </p>
      <p className="mt-3 text-sm leading-6 text-jv-navy">{summary}</p>

      {findings.length === 0 ? (
        <p className="mt-4 border-t border-jv-border pt-4 text-xs text-jv-muted">
          Additional financial evidence may be required to reach a fuller conclusion.
        </p>
      ) : (
        <ul className="mt-4 space-y-4 border-t border-jv-border pt-4">
          {findings.map((finding) => (
            <li key={finding.type + finding.description + (finding.source ?? '')} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-jv-navy">{finding.description}</p>
                <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-amber-500/30">
                  {finding.type.replace(/_/g, ' ')}
                </span>
              </div>
              {finding.amount_text && (
                <p className="mt-2 text-2xl font-bold text-jv-navy">{finding.amount_text}</p>
              )}
              <p className="mt-2 text-xs leading-5 text-jv-muted">{finding.reason}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {finding.source && (
                  <div>
                    <dt className="uppercase tracking-wider text-jv-muted">Source</dt>
                    <dd className="font-medium text-jv-navy">{finding.source}</dd>
                  </div>
                )}
                {finding.date && (
                  <div>
                    <dt className="uppercase tracking-wider text-jv-muted">Date</dt>
                    <dd className="font-medium text-jv-navy">{finding.date}</dd>
                  </div>
                )}
              </dl>
              {finding.supporting.length > 0 && (
                <p className="mt-2 text-[10px] uppercase tracking-wider text-jv-muted">
                  On record: {finding.supporting.slice(0, 3).join(' · ')}
                </p>
              )}
              {finding.human_review && (
                <p className="mt-2 text-[11px] font-medium text-amber-700">
                  Status: Human review required
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {findings.length > 0 && onViewEvidence && (
        <button
          type="button"
          onClick={onViewEvidence}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-jv-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-jv-navy/90"
        >
          View Evidence
          <Eye className="h-4 w-4" aria-hidden />
        </button>
      )}
    </section>
  )
}