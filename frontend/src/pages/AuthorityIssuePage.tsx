import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Hammer, ShieldCheck, Wrench } from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import { civicToView, fetchCivicIssue, fetchCivicIssueTimeline, transitionCivicIssue } from '../lib/api'
import type { CivicIssueDto, CivicTimelineEvent } from '../lib/api'
import { roleLabel } from '../lib/roles'

const ACTION_META: Record<string, { label: string; icon: typeof Hammer }> = {
  action: { label: 'Start Action', icon: Hammer },
  progress: { label: 'Work In Progress', icon: Wrench },
  'mark-fixed': { label: 'Mark Fixed', icon: CheckCircle2 },
}

export default function AuthorityIssuePage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const [dto, setDto] = useState<CivicIssueDto | null>(null)
  const [timeline, setTimeline] = useState<CivicTimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([fetchCivicIssue(id), fetchCivicIssueTimeline(id)])
      .then(([issue, events]) => {
        setDto(issue)
        setTimeline(events)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load this issue.'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    refresh()
  }, [refresh])

  const view = useMemo(() => (dto ? civicToView(dto) : null), [dto])

  const act = useCallback(
    async (action: 'action' | 'progress' | 'mark-fixed') => {
      if (!dto) return
      setBusy(action)
      setError(null)
      try {
        const updated = await transitionCivicIssue(dto.id, action)
        setDto(updated)
        const events = await fetchCivicIssueTimeline(id)
        setTimeline(events)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed.')
      } finally {
        setBusy(null)
      }
    },
    [dto, id],
  )

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-jv-border border-t-jv-blue" aria-label="Loading" />
      </div>
    )
  }

  if (error && !dto) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>
        <Link to="/authority" className="mt-4 inline-block text-sm font-semibold text-jv-blue hover:underline">
          Back to Authority Desk
        </Link>
      </div>
    )
  }

  if (!view || !dto) return null

  const canAct = dto.capabilities?.can_act ?? false
  const status = view.statusLabel
  const allowedActions: Array<'action' | 'progress' | 'mark-fixed'> = []
  if (status === 'CITIZEN-SUBMITTED' || status === 'UNDER PUBLIC REVIEW' || status === 'AUTHORITY NOTIFIED' || status === 'RESOLUTION DISPUTED') {
    allowedActions.push('action')
  }
  if (status === 'UNDER ACTION') allowedActions.push('progress')
  if (status === 'WORK IN PROGRESS') allowedActions.push('mark-fixed')

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-6">
      <Link to="/authority" className="inline-flex items-center gap-1.5 text-sm font-semibold text-jv-blue hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Authority Desk
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-jv-border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-jv-navy">{view.id}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                view.statusTone === 'green'
                  ? 'bg-jv-green/10 text-jv-green'
                  : view.statusTone === 'amber'
                    ? 'bg-amber-100 text-amber-800'
                    : view.statusTone === 'rose'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-jv-blue/10 text-jv-blue'
              }`}>
                {view.statusLabel}
              </span>
              {view.slaExceeded && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">24H EXCEEDED</span>
              )}
            </div>
            <p className="mt-2 text-sm text-jv-muted">{view.categoryLabel}</p>
            <p className="mt-3 text-sm leading-6 text-jv-navy">{view.description}</p>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-jv-muted">
              <span>Location: <span className="font-semibold text-jv-navy">{view.location}</span></span>
              <span>Reported: <span className="font-semibold text-jv-navy">{view.reportedAt}</span></span>
              <span>Confirmations: <span className="font-semibold text-jv-navy">{view.confirmations}</span></span>
              <span>TRUSTMESH: <span className="font-semibold text-jv-navy">{view.trustmesh.state}</span></span>
            </div>

            <figure className="mt-4 overflow-hidden rounded-xl">
              <img
                src={view.mainImage.url}
                alt={view.mainImage.caption}
                className="h-48 w-full object-cover"
                loading="lazy"
              />
              <figcaption className="bg-slate-50 px-3 py-2 text-[11px] text-jv-muted">
                {view.mainImage.caption} — {view.mainImage.attribution}
              </figcaption>
            </figure>

            {view.evidenceImages.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-jv-muted">Evidence</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {view.evidenceImages.map((img, i) => (
                    <img key={i} src={img.url} alt={img.caption} className="h-16 w-16 rounded-lg object-cover" loading="lazy" />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-jv-border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-jv-muted">Audit Timeline</h2>
            <ol className="mt-3 space-y-3">
              {timeline.length === 0 ? (
                <li className="text-sm text-jv-muted">No recorded events yet.</li>
              ) : (
                timeline.map((ev, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-jv-blue" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-jv-navy">
                        {ev.action.replace(/_/g, ' ').toUpperCase()}
                        <span className="ml-2 text-xs font-medium text-jv-muted">{ev.actor_email ?? 'system'}</span>
                      </p>
                      <p className="text-[11px] text-jv-muted">{new Date(ev.timestamp).toLocaleString()}</p>
                      <p className="mt-0.5 text-xs text-jv-muted">
                        {ev.before ? String((ev.before as { status?: string }).status ?? previously(ev.before)) : '—'} →{' '}
                        {ev.after ? String((ev.after as { status?: string }).status ?? 'updated') : '—'}
                      </p>
                    </div>
                  </li>
                ))
              )}
            </ol>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-jv-border bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-jv-muted">Authority Actions</p>
            {canAct && allowedActions.length > 0 ? (
              <div className="mt-3 space-y-2">
                {allowedActions.map((action) => {
                  const meta = ACTION_META[action]
                  const Icon = meta.icon
                  return (
                    <button
                      key={action}
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void act(action)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-jv-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-jv-blue/90 disabled:opacity-50"
                    >
                      <Icon className="h-4 w-4" aria-hidden /> {busy === action ? 'Working…' : meta.label}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="mt-3 text-sm text-jv-muted">
                No action available for the current status (
                {user ? <span className="font-semibold text-jv-navy">{roleLabel(user.role)}</span> : 'guest'}).
              </p>
            )}
            {canAct && allowedActions.length > 0 && (
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-jv-muted">
                <ShieldCheck className="h-3.5 w-3.5 text-jv-green" aria-hidden /> Authority role enforced server-side; supplied to{' '}
                {user?.email ?? 'the signed-in user'}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-jv-border bg-slate-50 p-5 text-sm text-jv-muted">
            <p className="font-semibold text-jv-navy">Workflow</p>
            <ol className="mt-2 space-y-1.5">
              {view.workflow.map((step, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      step.tone === 'ok' ? 'bg-jv-green' : step.tone === 'warn' ? 'bg-amber-400' : step.tone === 'bad' ? 'bg-rose-500' : 'bg-slate-300'
                    }`}
                    aria-hidden
                  />
                  <span className="text-xs">{step.label}</span>
                </li>
              ))}
            </ol>
          </div>

          {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
        </aside>
      </div>
    </div>
  )
}

function previously(before: unknown): string {
  try {
    return typeof before === 'object' && before !== null ? JSON.stringify(before) : String(before)
  } catch {
    return 'no prior status'
  }
}