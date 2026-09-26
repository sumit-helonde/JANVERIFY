import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, FolderOpen, LinkIcon } from 'lucide-react'

import { EmptyState, ErrorState, LoadingCards, LoadingPanel } from '../components/ui/AsyncState'
import { SectionCard, SyntheticBadge } from '../components/ui/PageBits'
import { useResource, useResourceWithParam } from '../hooks/useResource'
import {
  evidenceCardsFromApi,
  fetchProjectDecision,
  fetchProjectEvidence,
  fetchProjectEvidenceSummary,
  fetchProjectTimeline,
  fetchProjects,
  formatCrore,
  projectDecisionLabel,
} from '../lib/api'
import type { Project } from '../data/mockDashboard'

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-jv-border/60 py-2 last:border-0">
      <dt className="text-xs font-semibold uppercase tracking-wider text-jv-muted">{label}</dt>
      <dd className="text-sm font-semibold text-jv-navy">{value}</dd>
    </div>
  )
}

function ReportView({ project }: { project: Project }) {
  const summary = useResourceWithParam(['report-summary'], project.id, fetchProjectEvidenceSummary)
  const evidence = useResourceWithParam(['report-evidence'], project.id, fetchProjectEvidence)
  const decision = useResourceWithParam(['report-decision'], project.id, fetchProjectDecision)
  const timeline = useResourceWithParam(['report-timeline'], project.id, fetchProjectTimeline)

  const s = summary.data
  const empty = (m: string) => <p className="text-sm text-jv-muted">{m}</p>

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-jv-border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-jv-blue">Project report</p>
            <h2 className="mt-1 text-2xl font-bold text-jv-navy">
              {project.id} — {project.name}
            </h2>
            <p className="mt-1 text-sm text-jv-muted">
              {project.category} · {project.location} · {project.department ?? 'Department unassigned'} · Status:{' '}
              {project.status}
            </p>
          </div>
          <SyntheticBadge />
        </div>
      </div>

      <SectionCard title="PROJECT OVERVIEW">
        {!project ? empty('No project record.') : (
          <dl>
            <Row label="Reference" value={project.id} />
            <Row label="Status" value={project.status.replace(/_/g, ' ')} />
            <Row label="Government-reported progress" value={project.govProgress != null ? `${project.govProgress}%` : '—'} />
            <Row label="Evidence status" value={project.evidenceStatus} />
          </dl>
        )}
      </SectionCard>

      <SectionCard title="FINANCIAL TRAIL">
        {summary.isLoading && <LoadingPanel />}
        {summary.isError && <ErrorState message="Financial data unavailable." onRetry={() => void summary.refetch()} />}
        {s && (
          <dl>
            <Row label="Sanctioned" value={`₹${formatCrore(s.financials.sanctioned)}`} />
            <Row label="Contract" value={`₹${formatCrore(s.financials.contract)}`} />
            <Row label="Released" value={`₹${formatCrore(s.financials.released)}`} />
            <Row label="Recorded expenditure" value={`₹${formatCrore(s.financials.recorded_expenditure)}`} />
          </dl>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="PROGRESS">
          {s ? (
            <dl>
              <Row label="Government progress" value={s.progress.government != null ? `${s.progress.government}%` : '—'} />
              <Row label="Earlier independent inspection" value={s.progress.earlier_inspection != null ? `${s.progress.earlier_inspection}%` : '—'} />
              <Row label="Latest independent inspection" value={s.progress.latest_inspection != null ? `${s.progress.latest_inspection}%` : '—'} />
            </dl>
          ) : (
            empty('Progress data not available.')
          )}
        </SectionCard>
        <SectionCard title="INSPECTIONS">
          {s ? (
            <>
              <Row label="Independent inspection records" value={s.counts.evidence} />
              <Row label="Latest measured" value={s.progress.latest_inspection != null ? `${s.progress.latest_inspection}%` : '—'} />
              <p className="mt-2 text-xs text-jv-muted">
                Earlier {s.progress.earlier_inspection ?? '—'}% → Latest {s.progress.latest_inspection ?? '—'}%. Measured from on-record
                inspection findings.
              </p>
            </>
          ) : (
            empty('Inspection data not available.')
          )}
        </SectionCard>
      </div>

      <SectionCard title="EVIDENCE">
        {evidence.isLoading && <LoadingPanel />}
        {evidence.isError && <ErrorState message="Evidence records unavailable." onRetry={() => void evidence.refetch()} />}
        {evidence.data && (
          <>
            <Row label="On-record evidence entries" value={evidence.data.evidence.length} />
            <Row
              label="Citizen submissions (not verified)"
              value={`${evidence.data.citizen_reports.length} · CITIZEN-SUBMITTED · PENDING_REVIEW`}
            />
            <Row
              label="Recent evidence"
              value={evidence.data.evidence.length ? evidenceCardsFromApi(evidence.data)[0]?.title ?? '—' : 'None on record'}
            />
            <p className="mt-2 text-xs text-jv-muted">
              Citizen submissions stay clearly separated from verified records and are never treated as verified evidence.
            </p>
          </>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="TRUSTMESH DECISION">
          {decision.isLoading && <LoadingPanel />}
          {decision.isError && <ErrorState message="Decision unavailable." onRetry={() => void decision.refetch()} />}
          {decision.data ? (
            <>
              <Row label="State" value={s ? s.trustmesh.state : projectDecisionLabel(decision.data.state)} />
              <Row label="Claim evaluated" value="Government-reported progress vs. independent inspection records" />
              <Row label="Reasoning" value={s?.trustmesh.reason ?? decision.data.reason} />
              <p className="mt-3 rounded-lg bg-jv-navy/5 p-3 text-sm text-jv-navy">
                {s?.trustmesh.summary ?? decision.data.summary}
              </p>
            </>
          ) : (
            empty('Decision not available.')
          )}
        </SectionCard>
        <SectionCard title="FRAUDSCOPE REVIEW">
          {summary.isLoading && <LoadingPanel />}
          {s ? (
            <>
              <Row label="Status" value={s.fraudscope.status.replace(/_/g, ' ')} />
              <Row label="Amount under review" value={s.fraudscope.review_amount ?? '—'} />
              <Row label="Finding" value="Financial documentation needs review." />
              <p className="mt-2 text-xs leading-5 text-jv-muted">
                Anomaly type: financial documentation review. Supporting/missing records are visible on the project page. This is
                not an allegation of fraud — the records don't fully agree yet.
              </p>
            </>
          ) : (
            empty('FRAUDSCOPE data not available.')
          )}
        </SectionCard>
      </div>

      <SectionCard title="TIMELINE">
        {timeline.isLoading && <LoadingPanel />}
        {timeline.isError && <ErrorState message="Timeline unavailable." onRetry={() => void timeline.refetch()} />}
        {timeline.data && timeline.data.events.length === 0 && empty('No timeline events on record.')}
        {timeline.data && timeline.data.events.length > 0 && (
          <ol className="space-y-2">
            {timeline.data.events.map((ev, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-jv-blue" aria-hidden />
                <span>
                  <span className="font-semibold text-jv-navy">{ev.date}</span>{' '}
                  <span className="text-jv-muted">{ev.title}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>

      <SectionCard title="SOURCES">
        <ul className="space-y-2 text-sm">
          <li>
            <Link to={`/projects/${project.id}`} className="inline-flex items-center gap-2 font-semibold text-jv-blue hover:underline">
              <LinkIcon className="h-4 w-4" aria-hidden /> View Evidence — project record for {project.id}
            </Link>
          </li>
          <li>
            <Link to={`/projects/${project.id}/evidence-graph`} className="inline-flex items-center gap-2 font-semibold text-jv-blue hover:underline">
              <LinkIcon className="h-4 w-4" aria-hidden /> Evidence graph — source traceability
            </Link>
          </li>
        </ul>
        <p className="mt-3 text-xs text-jv-muted">
          Every major section above links to the underlying database-backed project record. No fabricated document links.
        </p>
      </SectionCard>
    </div>
  )
}

export default function ReportsPage() {
  const projects = useResource(['reports-list'], fetchProjects)
  const [selectedRef, setSelectedRef] = useState<string | null>(null)
  const selected = projects.data?.find((p) => p.id === selectedRef)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-jv-blue">Reports</p>
            <h1 className="mt-1 text-2xl font-bold text-jv-navy">Evidence-backed project reports</h1>
            <p className="mt-1 max-w-2xl text-sm text-jv-muted">
              Reports are generated from the actual project, financial, inspection, evidence and decision records in the database.
            </p>
          </div>
          <SyntheticBadge />
        </div>

        {projects.isLoading && <div className="mt-6"><LoadingCards count={3} /></div>}
        {projects.isError && (
          <div className="mt-6">
            <ErrorState message="Report index could not be loaded." onRetry={() => void projects.refetch()} />
          </div>
        )}
        {projects.isSuccess && projects.data?.length === 0 && (
          <div className="mt-6">
            <EmptyState title="No project reports available" message="No projects are on record yet." />
          </div>
        )}

        {projects.isSuccess && projects.data && projects.data.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
            <aside className="space-y-2 self-start rounded-2xl border border-jv-border bg-white p-4 lg:sticky lg:top-4">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-jv-muted">
                <FolderOpen className="h-4 w-4" aria-hidden /> Available reports
              </p>
              {projects.data.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedRef(p.id)}
                  className={`block w-full rounded-xl border px-3 py-2 text-left transition ${
                    selectedRef === p.id
                      ? 'border-jv-blue bg-jv-blue/10'
                      : 'border-jv-border bg-white hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-jv-navy">
                    <FileText className="h-3.5 w-3.5 text-jv-blue" aria-hidden />
                    {p.id}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-jv-muted">
                    {p.name} · {p.location}
                  </span>
                </button>
              ))}
            </aside>

            <div data-testid="report-view" className="min-w-0">
              {selected ? (
                <ReportView key={selected.id} project={selected} />
              ) : (
                <EmptyState
                  title="Select a report"
                  message={`Choose a project from the list to open its evidence-backed report. NRD-204 — Ward 24 Road Development is the reference demo.`}
                />
              )}
            </div>
          </div>
        )}
    </div>
  )
}