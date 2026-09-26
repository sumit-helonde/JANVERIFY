import { useCallback } from 'react'
import { CheckCircle2, Hammer, Radio, Wrench } from 'lucide-react'

import CivicIssueRow, { SectionHeader, StatCard } from '../components/civicwatch/CivicIssueRow'
import { useAuth } from '../context/AuthContext'
import { useCivicData } from '../lib/useCivicData'
import { transitionCivicIssue } from '../lib/api'
import { roleShort } from '../lib/roles'

export default function AuthorityPage() {
  const { user } = useAuth()
  const { issues, summary, loading, error, refresh } = useCivicData()
  const { role } = user ?? {}

  const toolkit = role === 'department_official' ? [] : Array.from(issues)

  const act = useCallback(
    async (id: number | string, action: 'action' | 'progress' | 'mark-fixed') => {
      await transitionCivicIssue(id, action)
      refresh()
    },
    [refresh],
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeader
          eyebrow={`Authority Desk${user ? ` · ${roleShort(user.role)}` : ''}`}
          title="Issues needing action"
          note="Respond to civic reports, log work, and record completion. Every action is audited."
        />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-jv-blue/10 px-3 py-1 text-xs font-semibold text-jv-blue">
          <Radio className="h-3.5 w-3.5" aria-hidden /> FIELD WORK LOG
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard value={summary?.new_reports ?? '—'} label="New / Notified" accent="#1d5cc7" />
        <StatCard value={summary?.under_action ?? '—'} label="Under Action" accent="#d97706" />
        <StatCard value={summary?.awaiting_verification ?? '—'} label="Marked Fixed" accent="#179c5d" />
        <StatCard value={summary?.conflicting ?? '—'} label="Conflicting" accent="#e11d48" />
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="flex justify-center rounded-2xl border border-jv-border bg-white p-14">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-jv-border border-t-jv-blue" aria-label="Loading" />
          </div>
        ) : error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error} — <button type="button" onClick={refresh} className="underline">Retry</button>
          </p>
        ) : toolkit.length === 0 ? (
          <div className="rounded-2xl border border-jv-border bg-white p-10 text-center">
            <p className="text-sm font-semibold text-jv-navy">No civic issues on record</p>
            <p className="mt-1 text-xs text-jv-muted">New citizen reports will appear here.</p>
          </div>
        ) : (
          toolkit.map((issue) => {
            const status = issue.statusLabel
            const canStart =
              status === 'CITIZEN-SUBMITTED' || status === 'UNDER PUBLIC REVIEW' || status === 'AUTHORITY NOTIFIED' || status === 'RESOLUTION DISPUTED'
            const canProgress = status === 'UNDER ACTION'
            const canMark = status === 'WORK IN PROGRESS'
            return (
              <CivicIssueRow
                key={issue.id}
                issue={issue}
                detailHref={`/authority/issues/${issue.id}`}
                actions={
                  <>
                    {canStart && (
                      <button
                        type="button"
                        onClick={() => void act(issue.id, 'action')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-jv-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-jv-blue/90"
                      >
                        <Hammer className="h-3.5 w-3.5" aria-hidden /> Start Action
                      </button>
                    )}
                    {canProgress && (
                      <button
                        type="button"
                        onClick={() => void act(issue.id, 'progress')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-jv-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-jv-blue/90"
                      >
                        <Wrench className="h-3.5 w-3.5" aria-hidden /> Work In Progress
                      </button>
                    )}
                    {canMark && (
                      <button
                        type="button"
                        onClick={() => void act(issue.id, 'mark-fixed')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-jv-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-jv-green/90"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Mark Fixed
                      </button>
                    )}
                    {!canStart && !canProgress && !canMark && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-jv-green/10 px-3 py-1.5 text-xs font-semibold text-jv-green">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Recorded
                      </span>
                    )}
                  </>
                }
              />
            )
          })
        )}
      </div>

      <p className="mt-6 text-xs leading-5 text-jv-muted">
        Opening a case from Citizen Desk (<span className="text-jv-navy">/authority/issues/:id</span>) shows the full
        evidence timeline. Actions are restricted to the <span className="font-semibold text-jv-navy">Authority</span>{' '}
        role server-side.
      </p>
    </div>
  )
}