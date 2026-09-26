import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Clock, MapPin, ThumbsUp } from 'lucide-react'

import type { CivicIssue } from '../../data/civicWatchData'

const TONES: Record<CivicIssue['statusTone'], string> = {
  blue: 'bg-jv-blue/10 text-jv-blue',
  green: 'bg-jv-green/10 text-jv-green',
  amber: 'bg-amber-100 text-amber-800',
  rose: 'bg-rose-100 text-rose-700',
  slate: 'bg-slate-100 text-jv-navy',
}

interface CivicIssueRowProps {
  issue: CivicIssue
  detailHref?: string
  actions?: ReactNode
}

export default function CivicIssueRow({ issue, detailHref, actions }: CivicIssueRowProps) {
  const inner = (
    <div className="flex items-center gap-4">
      <span
        className="hidden h-2.5 w-2.5 shrink-0 rounded-full sm:block"
        style={{ backgroundColor: issue.categoryColor }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-bold text-jv-navy">{issue.id}</p>
          <span className="truncate text-sm text-jv-muted">{issue.categoryLabel}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${TONES[issue.statusTone]}`}>
            {issue.statusLabel}
          </span>
          {issue.slaExceeded && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
              24H EXCEEDED
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-jv-muted" title={issue.description}>
          {issue.description}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-jv-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" aria-hidden /> {issue.location}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden /> {issue.reportedAt}
          </span>
          <span className="inline-flex items-center gap-1">
            <ThumbsUp className="h-3 w-3" aria-hidden /> {issue.confirmations} confirmed
          </span>
          <span className="italic">TRUSTMESH {issue.trustmesh.state}</span>
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap justify-end gap-2">{actions}</div>}
    </div>
  )

  return (
    <div className="rounded-2xl border border-jv-border bg-white p-4 shadow-sm transition hover:shadow-md">
      {detailHref ? <Link to={detailHref} className="block">{inner}</Link> : inner}
    </div>
  )
}

export function SectionHeader({ eyebrow, title, note }: { eyebrow: string; title: string; note?: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-jv-muted">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-bold tracking-tight text-jv-navy">{title}</h2>
      {note && <p className="mt-1 text-sm text-jv-muted">{note}</p>}
    </div>
  )
}

export function StatCard({ value, label, accent }: { value: string | number; label: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-jv-border bg-white p-4 shadow-sm">
      <div className="text-2xl font-bold tabular-nums text-jv-navy" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      <div className="mt-0.5 text-[11px] font-medium text-jv-muted">{label}</div>
    </div>
  )
}