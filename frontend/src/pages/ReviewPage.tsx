import { useCallback, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Scale, ShieldAlert, ShieldCheck } from 'lucide-react'

import CivicIssueRow, { SectionHeader, StatCard } from '../components/civicwatch/CivicIssueRow'
import { useAuth } from '../context/AuthContext'
import { useCivicData } from '../lib/useCivicData'
import { reviewCivicIssue } from '../lib/api'
import { roleShort } from '../lib/roles'
import { SYNTHETIC_LABEL } from '../data/mockDashboard'

const DECISIONS: Array<{ decision: string; label: string; hint: string }> = [
  { decision: 'SUPPORTED', label: 'Accept', hint: 'resolve case' },
  { decision: 'CONFLICTING', label: 'Uphold conflict', hint: 'keep conflicting' },
  { decision: 'INCOMPLETE', label: 'Request evidence', hint: 'back to authority' },
  { decision: 'INSUFFICIENT', label: 'Mark insufficient', hint: 'back to authority' },
]

export default function ReviewPage() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const { issues, caps, summary, loading, error, refresh } = useCivicData()
  const [busy, setBusy] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const conflicting = issues.filter((i) => i.trustmesh.state === 'CONFLICTING')

  const decide = useCallback(
    async (id: string, decision: string) => {
      setBusy(id)
      setFlash(null)
      try {
        await reviewCivicIssue(id, decision)
        setFlash(`Decision "${decision}" recorded for ${id} (audited).`)
        refresh()
      } catch (err) {
        setFlash(err instanceof Error ? err.message : 'Decision failed.')
      } finally {
        setBusy(null)
      }
    },
    [refresh],
  )

  const tab = pathname.split('/').filter(Boolean)[1] ?? 'overview'

  const DecisionButtons = ({ id, allow }: { id: string; allow: boolean }) =>
    !allow ? (
      <span className="text-[11px] font-medium text-jv-muted">Team review role required</span>
    ) : (
      <div className="flex flex-wrap gap-2">
        {DECISIONS.map((d) => (
          <button
            key={d.decision}
            type="button"
            disabled={busy === id}
            onClick={() => void decide(id, d.decision)}
            title={d.hint}
            className="rounded-lg border border-jv-border bg-white px-3 py-1.5 text-xs font-semibold text-jv-navy hover:border-jv-blue hover:text-jv-blue disabled:opacity-50"
          >
            {busy === id ? 'Working…' : d.label}
          </button>
        ))}
      </div>
    )

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeader
          eyebrow={`JANVERIFY Neutral Team${user ? ` · ${roleShort(user.role)}` : ''}`}
          title="Human review console"
          note="Where citizens and authorities disagree, TRUSTMESH flags the case for neutral-team review. Decisions are audited."
        />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-jv-navy px-3 py-1 text-xs font-semibold text-white">
          <Scale className="h-3.5 w-3.5" aria-hidden /> NEUTRAL TEAM
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-b border-jv-border pb-3">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'evidence', label: 'Evidence' },
          { key: 'decisions', label: 'Decisions' },
        ].map((t) => (
          <Link
            key={t.key}
            to={t.key === 'overview' ? '/review' : `/review/${t.key}`}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              tab === t.key ? 'bg-jv-blue text-white' : 'bg-white text-jv-navy hover:bg-slate-50'
            } border border-jv-border`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {flash && (
        <p className="mt-4 rounded-xl border border-jv-border bg-white px-4 py-3 text-sm font-semibold text-jv-navy shadow-sm">{flash}</p>
      )}

      {tab === 'overview' && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard value={summary?.conflicting ?? '—'} label="Conflicting" accent="#e11d48" />
            <StatCard value={conflicting.length} label="Awaiting Team" accent="#7c3aed" />
            <StatCard value={summary?.new_reports ?? '—'} label="New Reports" accent="#1d5cc7" />
            <StatCard value={summary?.resolved ?? '—'} label="Resolved" accent="#179c5d" />
          </div>

          {conflicting.length > 0 && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" aria-hidden />
              <div>
                <p className="text-sm font-bold text-rose-800">Resolution dispute detected</p>
                <p className="mt-0.5 text-sm text-rose-700">
                  {conflicting.length} case{conflicting.length === 1 ? '' : 's'} where the authority claims a fix but citizens report it
                  still exists. These require a neutral-team decision and are excluded from the 24h SLA countdown until reviewed.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-3">
            {loading ? (
              <div className="flex justify-center rounded-2xl border border-jv-border bg-white p-14">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-jv-border border-t-jv-blue" aria-label="Loading" />
              </div>
            ) : error ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {error} — <button type="button" onClick={refresh} className="underline">Retry</button>
              </p>
            ) : conflicting.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl border border-jv-border bg-white p-8">
                <ShieldCheck className="h-8 w-8 text-jv-green" aria-hidden />
                <p className="text-sm font-semibold text-jv-navy">No conflicts in the queue right now.</p>
              </div>
            ) : (
              conflicting.map((issue) => (
                <CivicIssueRow
                  key={issue.id}
                  issue={issue}
                  detailHref={`/civicwatch`}
                  actions={<DecisionButtons id={issue.id} allow={caps.get(issue.id)?.can_review ?? false} />}
                />
              ))
            )}
          </div>
        </>
      )}

      {tab === 'evidence' && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <p className="text-sm text-jv-muted">Loading evidence…</p>
          ) : (
            issues.map((issue) => (
              <figure key={issue.id} className="overflow-hidden rounded-2xl border border-jv-border bg-white shadow-sm">
                <img src={issue.mainImage.url} alt={issue.mainImage.caption} className="h-40 w-full object-cover" loading="lazy" />
                <figcaption className="p-4">
                  <p className="text-sm font-bold text-jv-navy">{issue.id} · {issue.location}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-jv-muted">{issue.description}</p>
                  <p className="mt-2 text-[11px] text-jv-muted">
                    {issue.mainImage.caption} — {issue.mainImage.attribution}
                  </p>
                </figcaption>
              </figure>
            ))
          )}
          {!loading && issues.length === 0 && (
            <p className="rounded-2xl border border-jv-border bg-white p-8 text-center text-sm text-jv-muted">No evidence on record.</p>
          )}
        </div>
      )}

      {tab === 'decisions' && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-jv-border bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-jv-border text-[11px] uppercase tracking-wider text-jv-muted">
                <th className="px-4 py-3 font-semibold">Case</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">TRUSTMESH</th>
                <th className="px-4 py-3 font-semibold">Decision</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <tr key={issue.id} className="border-b border-jv-border last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-bold text-jv-navy">{issue.id}</p>
                    <p className="text-xs text-jv-muted">{issue.categoryLabel}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-jv-navy">{issue.statusLabel}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      issue.trustmesh.state === 'CONFLICTING'
                        ? 'bg-rose-100 text-rose-700'
                        : issue.trustmesh.state === 'SUPPORTED'
                          ? 'bg-jv-green/10 text-jv-green'
                          : 'bg-amber-100 text-amber-800'
                    }`}>
                      {issue.trustmesh.state}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <DecisionButtons id={issue.id} allow={caps.get(issue.id)?.can_review ?? false} />
                  </td>
                </tr>
              ))}
              {issues.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-jv-muted">No decisions on record.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-xs leading-5 text-jv-muted">
        Case data is {SYNTHETIC_LABEL} generated for the demo. Decisions here are real backend audit records; they feed the
        TrustMesh state visible to citizens.
      </p>
    </div>
  )
}