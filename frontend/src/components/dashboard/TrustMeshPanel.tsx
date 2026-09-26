import { AlertTriangle, ArrowRight, Check, Eye, HelpCircle } from 'lucide-react'

export interface TrustMeshDecisionView {
  state: string
  message: string
  summary?: string
  supporting?: string[]
  conflicting?: string[]
  missing?: string[]
  sources?: { type: string; reference: string; date: string | null }[]
}

interface TrustMeshPanelProps {
  decision: string
  message: string
  progress: { gov: number; earlier: number; latest: number }
  view?: TrustMeshDecisionView
  href?: string
  onViewEvidence?: () => void
}

export default function TrustMeshPanel({
  decision,
  message,
  progress,
  view,
  href,
  onViewEvidence,
}: TrustMeshPanelProps) {
  const blocking = (view?.conflicting?.length ?? 0) > 0
  const supporting = view?.supporting ?? []
  const conflicting = view?.conflicting ?? []
  const missing = view?.missing ?? []
  const sources = view?.sources ?? []
  const summary = view?.summary ?? message

  return (
    <section
      aria-label="TRUSTMESH decision"
      className={
        blocking
          ? 'rounded-2xl border border-amber-500/40 bg-white p-5 shadow-sm'
          : 'rounded-2xl border border-jv-border bg-white p-5 shadow-sm'
      }
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-jv-muted">
          TrustMesh Decision
        </p>
        <span
          data-testid="trustmesh-state"
          className={
            blocking
              ? 'inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-700'
              : 'inline-flex items-center gap-1.5 rounded-full bg-jv-blue/10 px-3 py-1 text-xs font-bold text-jv-blue'
          }
        >
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          {decision}
        </span>
      </div>

      <p className="mt-3 text-sm font-medium leading-relaxed text-jv-navy">{summary}</p>

      <dl className="mt-4 space-y-2 border-t border-jv-border pt-4">
        {[
          { label: 'Government', value: progress.gov },
          { label: 'Earlier Inspection', value: progress.earlier },
          { label: 'Latest Inspection', value: progress.latest },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <dt className="w-32 shrink-0 text-xs text-jv-muted">{row.label}</dt>
            <dd className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-jv-blue"
                style={{ width: `${row.value}%` }}
              />
            </dd>
            <dd className="w-9 shrink-0 text-right text-sm font-semibold text-jv-navy">
              {row.value}%
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 border-t border-jv-border pt-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-jv-muted">
          <HelpCircle className="h-3.5 w-3.5 text-jv-blue" aria-hidden />
          Why this decision?
        </p>
        <p className="mt-2 text-xs leading-5 text-jv-muted">{view?.message ?? message}</p>

        {supporting.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {supporting.map((item) => (
              <li key={item} className="flex items-start gap-1.5 text-xs text-jv-navy">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-jv-green" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        )}

        {conflicting.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {conflicting.map((item) => (
              <li key={item} className="flex items-start gap-1.5 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        )}

        {missing.length > 0 && (
          <p className="mt-3 border-t border-jv-border pt-3 text-xs text-jv-muted">
            <span className="font-semibold text-jv-navy">Missing / required: </span>
            {missing.join(' · ')}
          </p>
        )}

        {sources.length > 0 && (
          <p className="mt-2 text-[10px] uppercase tracking-wider text-jv-muted">
            Sources: {sources.map((s) => s.reference).join(' · ')}
          </p>
        )}
      </div>

      {(onViewEvidence || href) && (
        <div className="mt-4 flex flex-col gap-2">
          {onViewEvidence && (
            <button
              type="button"
              onClick={onViewEvidence}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-jv-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-jv-navy/90"
            >
              View Evidence
              <Eye className="h-4 w-4" aria-hidden />
            </button>
          )}
          {href && (
            <a
              href={href}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-jv-border px-4 py-2 text-sm font-semibold text-jv-navy transition-colors hover:bg-slate-50"
            >
              View Details
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          )}
        </div>
      )}
    </section>
  )
}