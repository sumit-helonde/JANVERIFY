import { Landmark } from 'lucide-react'

import CivicIssueRow, { SectionHeader, StatCard } from '../components/civicwatch/CivicIssueRow'
import { useAuth } from '../context/AuthContext'
import { useCivicData } from '../lib/useCivicData'
import { useResource } from '../hooks/useResource'
import { fetchProjects } from '../lib/api'
import { roleShort } from '../lib/roles'

const STATUS_PILL: Record<string, string> = {
  'In Progress': 'bg-amber-100 text-amber-800',
  Completed: 'bg-jv-green/10 text-jv-green',
  Delayed: 'bg-rose-100 text-rose-700',
}

export default function GovernmentPage() {
  const { user } = useAuth()
  const { issues, summary, loading, error, refresh } = useCivicData()
  const { data: projects = [] } = useResource(['government-projects'], fetchProjects)

  const actionable = issues.filter((i) => i.statusLabel !== 'RESOLVED' && i.statusLabel !== 'CLOSED')

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeader
          eyebrow={`Government / Department${user ? ` · ${roleShort(user.role)}` : ''}`}
          title="Public works oversight"
          note="Read-only monitoring of sanctioned projects and the civic response record. Oversight role cannot mark cases."
        />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-jv-green/10 px-3 py-1 text-xs font-semibold text-jv-green">
          <Landmark className="h-3.5 w-3.5" aria-hidden /> OVERSIGHT VIEW
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard value={projects.length} label="Public Projects" accent="#1d5cc7" />
        <StatCard value={projects.filter((p) => p.status === 'In Progress').length} label="In Progress" accent="#d97706" />
        <StatCard value={projects.filter((p) => p.status === 'Completed').length} label="Completed" accent="#179c5d" />
        <StatCard value={projects.filter((p) => p.status === 'Delayed').length} label="Delayed" accent="#e11d48" />
      </div>

      <div className="mt-8">
        <SectionHeader eyebrow="Projects Register" title="Sanctioned public projects" />
        <div className="mt-4 overflow-x-auto rounded-2xl border border-jv-border bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-jv-border text-[11px] uppercase tracking-wider text-jv-muted">
                <th className="px-4 py-3 font-semibold">Project</th>
                <th className="px-4 py-3 font-semibold">Department</th>
                <th className="px-4 py-3 font-semibold">Budget</th>
                <th className="px-4 py-3 font-semibold">Progress</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b border-jv-border last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-bold text-jv-navy">{p.id}</p>
                    <p className="text-xs text-jv-muted">{p.name}</p>
                  </td>
                  <td className="px-4 py-3 text-jv-muted">{p.department}</td>
                  <td className="px-4 py-3 tabular-nums text-jv-navy">{p.budget}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-jv-blue" style={{ width: `${Math.min(100, p.progress)}%` }} />
                      </div>
                      <span className="text-xs tabular-nums text-jv-muted">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_PILL[p.status] ?? 'bg-slate-100 text-jv-navy'}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-jv-muted">No sanctioned projects currently on the register.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8">
        <SectionHeader
          eyebrow="Civic Watch Digest"
          title="Open civic response record"
          note={summary ? `${summary.new_reports} new reports, ${summary.conflicting} conflicting, ${summary.awaiting_verification} awaiting verification.` : undefined}
        />
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="flex justify-center rounded-2xl border border-jv-border bg-white p-14">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-jv-border border-t-jv-blue" aria-label="Loading" />
            </div>
          ) : error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error} — <button type="button" onClick={refresh} className="underline">Retry</button>
            </p>
          ) : actionable.length === 0 ? (
            <p className="rounded-2xl border border-jv-border bg-white p-8 text-center text-sm text-jv-muted">
              No open civic cases right now.
            </p>
          ) : (
            actionable.map((issue) => <CivicIssueRow key={issue.id} issue={issue} detailHref={`/civicwatch`} />)
          )}
        </div>
      </div>
    </div>
  )
}