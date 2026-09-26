import { CalendarDays, Eye, FileText } from 'lucide-react'

import type { EvidenceCardData } from '../../data/mockDashboard'
import { SYNTHETIC_LABEL } from '../../data/mockDashboard'

const STATE_STYLES: Record<EvidenceCardData['state'], string> = {
  SUPPORTED: 'bg-jv-green/10 text-jv-green',
  PENDING_REVIEW: 'bg-sky-500/10 text-sky-600',
  REVIEW: 'bg-amber-500/15 text-amber-700',
}

export default function EvidenceCards({
  items,
}: {
  items: EvidenceCardData[]
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((card) => (
        <article
          key={card.id}
          className="flex flex-col rounded-2xl border border-jv-border bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-jv-blue/10 px-2.5 py-1 text-xs font-semibold text-jv-blue">
              <FileText className="h-3.5 w-3.5" aria-hidden />
              {card.type}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATE_STYLES[card.state]}`}
            >
              {card.state === 'PENDING_REVIEW' ? 'Pending Review' : card.state}
            </span>
          </div>

          <h4 className="mt-3 text-sm font-bold text-jv-navy">{card.title}</h4>
          <p className="mt-1.5 grow text-xs leading-5 text-jv-muted">
            {card.summary}
          </p>

          <div className="mt-4 flex items-center justify-between border-t border-jv-border pt-3 text-xs text-jv-muted">
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-jv-green" aria-hidden />
              {card.source}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              {card.date}
            </span>
          </div>
          <p className="mt-3 text-[10px] uppercase tracking-wider text-jv-muted">
            {SYNTHETIC_LABEL}
          </p>
        </article>
      ))}
    </div>
  )
}