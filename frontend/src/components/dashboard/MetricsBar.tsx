import { fetchDashboardSummary, formatCrore } from '../../lib/api'
import { useResource } from '../../hooks/useResource'

export default function MetricsBar() {
  const { data: summary, isLoading, isError } = useResource(
    ['dashboard-summary'],
    fetchDashboardSummary,
  )

  if (isLoading) {
    return (
      <div data-testid="loading-metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-jv-border/40" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div data-testid="metrics-error" className="rounded-xl border border-jv-border bg-white px-4 py-3 text-sm text-jv-muted">
        Dashboard summary unavailable.
      </div>
    )
  }

  const projects = summary ? String(summary.projects.total) : '—'
  const funds = summary ? formatCrore(summary.sanctioned_total) : '—'
  const evidence = summary ? String(summary.evidence_count) : '—'

  return (
    <div data-testid="metrics-bar" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Metric value={projects} label="Projects" />
      <Metric value={funds} label="Sanctioned Funds" />
      <Metric value={evidence} label="Evidence" />
    </div>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-jv-border bg-white p-4 text-center shadow-sm">
      <div className="text-2xl font-bold tabular-nums text-jv-navy">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-jv-muted">{label}</div>
    </div>
  )
}