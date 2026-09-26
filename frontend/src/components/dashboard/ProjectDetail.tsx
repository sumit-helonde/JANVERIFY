import { FileText, Landmark, ScrollText, UserRound } from 'lucide-react'
import { useState } from 'react'

import type { EvidenceCardData, Project } from '../../data/mockDashboard'
import { SYNTHETIC_LABEL } from '../../data/mockDashboard'
import { moneyTrailFromDetail, type EvidenceSummary } from '../../lib/api'
import { EmptyState } from '../ui/AsyncState'
import EvidenceCards from './EvidenceCards'
import EvidenceViewerModal, { NMC_EVIDENCE } from '../project/EvidenceViewerModal'
import FinancialPanel from './FinancialPanel'
import FraudScopePanel, { type FraudscopePanelData } from './FraudScopePanel'
import LeafletMap from './LeafletMap'
import MoneyTrail, { type MoneyTrailItem } from './MoneyTrail'
import QuickActions from './QuickActions'
import TrustMeshPanel, { type TrustMeshDecisionView } from './TrustMeshPanel'

export interface ProjectTimelineEvent {
  date: string
  type: string
  title: string
}

export interface CitizenReportView {
  reference: string
  description: string
  status: string
  review_status: string
  reported_at: string | null
  photos: string[]
  report_type: string
}

export interface ProjectDetailExtras {
  moneyTrail?: MoneyTrailItem[]
  evidence?: EvidenceCardData[]
  citizenReports?: CitizenReportView[]
  timeline?: ProjectTimelineEvent[]
  decision?: { state: string; message: string } & Partial<TrustMeshDecisionView>
  progress?: { gov: number; earlier: number; latest: number }
  financialReview?: { amount: string; message: string }
  fraudscope?: FraudscopePanelData
  evidenceSummary?: EvidenceSummary
}

interface ProjectDetailProps {
  project: Project
  eyebrow?: string
  extras?: ProjectDetailExtras
}

const TABS = ['Overview', 'Evidence', 'Financials', 'Timeline', 'Map'] as const

type Tab = (typeof TABS)[number]

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-jv-border bg-slate-50 px-3 py-2.5">
      <p className="text-xs text-jv-muted">{label}</p>
      <p className="text-sm font-bold text-jv-navy">{value}</p>
    </div>
  )
}

function TimelineWidget({ events = [] }: { events?: ProjectTimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No timeline events"
        message="Project timeline events will appear here once records exist."
      />
    )
  }
  return (
    <div className="rounded-2xl border border-jv-border bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2 pb-4 text-sm font-semibold text-jv-navy">
        <ScrollText className="h-4 w-4 text-jv-blue" aria-hidden />
        Timeline
      </h3>
      <ol className="space-y-3">
        {events.map((item, i) => (
          <li key={`${item.date}-${i}`} className="flex items-start gap-3">
            <span
              className={
                item.type === 'inspection' || item.type === 'evidence'
                  ? 'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-jv-green'
                  : item.type === 'payment'
                    ? 'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-rose-400'
                    : 'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-jv-blue'
              }
              aria-hidden
            />
            <div className="flex flex-1 flex-wrap items-baseline justify-between gap-1">
              <span className="text-sm font-medium text-jv-navy">{item.title}</span>
              <span className="text-xs text-jv-muted">
                {item.date} · {item.type.replace(/_/g, ' ')}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

const DEFAULT_DECISION = {
  state: 'INSUFFICIENT',
  message: 'Verification verdict is computed in a later phase from evidence.',
}

function evidenceAnswer(summary: EvidenceSummary): string {
  const f = summary.financials
  const p = summary.progress
  const money =
    typeof f.sanctioned === 'number' ? `${f.sanctioned} Cr was sanctioned for ${summary.project_reference}` : 'The sanctioned budget'
  const parts: string[] = []
  if (typeof f.contract === 'number') parts.push(`the contract is valued at ${f.contract} Cr`)
  if (typeof f.released === 'number') parts.push(`${f.released} Cr has been released`)
  if (typeof f.recorded_expenditure === 'number') parts.push(`${f.recorded_expenditure} Cr is recorded as expenditure`)
  const progressBits: string[] = []
  if (typeof p.government === 'number') progressBits.push(`the government reports ${p.government}% physical progress`)
  if (typeof p.latest_inspection === 'number') progressBits.push(`independent inspections measured ${p.latest_inspection}% latest`)
  if (typeof p.earlier_inspection === 'number') progressBits.push(`${p.earlier_inspection}% earlier`)
  let answer = `${money}, with ${parts.join(', ')}.`
  if (progressBits.length > 0) answer += ` On progress: ${progressBits.join('; ')}.`
  answer += ` TRUSTMESH currently rates this as ${summary.trustmesh.state} — ${summary.trustmesh.summary}`
  if (summary.fraudscope.review_amount) {
    answer += ` FRAUDSCOPE flags ${summary.fraudscope.review_amount} of financial documentation requiring review.`
  }
  answer += ` There are ${summary.counts.evidence} on-record evidence entries and ${summary.counts.citizen_reports} citizen submission(s) pending review.`
  return answer
}

export default function ProjectDetail({ project, eyebrow, extras }: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [evidenceViewerOpen, setEvidenceViewerOpen] = useState(false)

  const moneyTrail = extras?.moneyTrail ?? moneyTrailFromDetail(project)
  const decision = extras?.decision ?? DEFAULT_DECISION
  const progress = extras?.progress ?? {
    gov: project.govProgress,
    earlier: project.earlierInspection,
    latest: project.latestInspection,
  }
  const evidence = extras?.evidence ?? []
  const citizenReports = extras?.citizenReports ?? []
  const timeline = extras?.timeline ?? []
  const financialReview = extras?.financialReview

  return (
    <section aria-label={`Project details: ${project.name}`} className="mx-auto max-w-7xl px-4 pb-10 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3 pt-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-jv-blue">
            {eyebrow ?? `Featured Project · ${project.id}`}
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-jv-navy">
            {project.name}
          </h2>
          <p className="mt-1 text-sm text-jv-muted">
            {project.department} · {project.location}
          </p>
        </div>
        <span
          data-testid="featured-synthetic-badge"
          className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700"
        >
          {SYNTHETIC_LABEL}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <MetricChip label="Sanctioned" value={project.sanctioned} />
        <MetricChip label="Contract" value={project.contract} />
        <MetricChip label="Released" value={project.released} />
        <MetricChip label="Expenditure" value={project.expenditure} />
        <MetricChip label="Government Progress" value={`${project.govProgress}%`} />
        <MetricChip label="Latest Inspection" value={`${progress.latest}%`} />
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          <div role="tablist" aria-label="Project tabs" className="flex flex-wrap gap-1 border-b border-jv-border">
            {TABS.map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={
                  activeTab === tab
                    ? 'border-b-2 border-jv-blue px-4 py-2.5 text-sm font-semibold text-jv-blue'
                    : 'border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-jv-muted hover:text-jv-navy'
                }
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="mt-5" role="tabpanel">
            {activeTab === 'Overview' && (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
                <div className="space-y-5">
                  <p className="text-sm leading-6 text-jv-muted">{project.description}</p>
                  <MoneyTrail items={moneyTrail} />
                </div>
                <div className="rounded-2xl border border-jv-border bg-white p-5 text-sm shadow-sm">
                  <h3 className="pb-3 text-xs font-semibold uppercase tracking-wider text-jv-muted">
                    Quick Facts
                  </h3>
                  <dl className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="flex items-center gap-1.5 text-jv-muted">
                        <Landmark className="h-3.5 w-3.5" aria-hidden />
                        Department
                      </dt>
                      <dd className="font-medium text-jv-navy">{project.department}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="flex items-center gap-1.5 text-jv-muted">
                        <UserRound className="h-3.5 w-3.5" aria-hidden />
                        Contractor
                      </dt>
                      <dd className="font-medium text-jv-navy">{project.contractor}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-jv-muted">Tender ref</dt>
                      <dd className="font-medium text-jv-navy">{project.tender}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}

            {activeTab === 'Overview' && extras?.evidenceSummary && (
              <div className="rounded-2xl border border-jv-border bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-jv-blue">
                  Evidence-backed Q&amp;A
                </p>
                <h3 className="mt-1 text-base font-bold text-jv-navy">
                  “Where did the money go and what evidence supports the progress?”
                </h3>
                <p className="mt-2 text-sm leading-6 text-jv-muted">
                  {evidenceAnswer(extras.evidenceSummary)}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('Evidence')}
                  className="mt-4 inline-flex items-center rounded-lg bg-jv-blue/10 px-3 py-2 text-sm font-semibold text-jv-blue hover:bg-jv-blue/20"
                >
                  View Evidence
                </button>
              </div>
            )}

            {activeTab === 'Evidence' &&
              (evidence.length === 0 && citizenReports.length === 0 ? (
                <EmptyState
                  title="No evidence records yet"
                  message="Evidence captured for this project will appear in the feed."
                />
              ) : (
                <>
                  <div className="rounded-2xl border border-jv-border bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="inline-flex items-center gap-1.5 rounded-full bg-jv-blue/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-jv-blue">
                        <Landmark className="h-3 w-3" aria-hidden />
                        Official Government Report
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-jv-blue/10 px-2 py-0.5 text-[10px] font-semibold text-jv-blue">
                          DEMO EVIDENCE
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                          OFFICIAL PUBLIC SOURCE
                        </span>
                      </div>
                    </div>
                    <h4 className="mt-3 text-base font-bold text-jv-navy">
                      {NMC_EVIDENCE.documentTitle}
                    </h4>
                    <p className="mt-0.5 text-sm text-jv-muted">
                      Published by {NMC_EVIDENCE.publisher} · {NMC_EVIDENCE.publisherShort}
                    </p>
                    <p className="mt-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-2.5 text-xs leading-5 text-amber-900">
                      This is a demo reference to a real public source provided for the hackathon
                      demo. It is not presented as verified evidence for this specific project.
                    </p>
                <button
                  type="button"
                  onClick={() => setEvidenceViewerOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-jv-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-jv-blue/90"
                >
                  <FileText className="h-4 w-4" aria-hidden />
                  View Evidence
                </button>
                  </div>

                  {citizenReports.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-amber-900">
                          Citizen Evidence
                        </h3>
                        <p className="text-xs text-amber-800">
                          Submitted by citizens · shown separately from verified records
                        </p>
                      </div>
                      <ul className="mt-3 space-y-3">
                        {citizenReports.map((cr) => (
                          <li key={cr.reference} className="rounded-lg border border-amber-200 bg-white p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-jv-navy">{cr.reference}</p>
                              <div className="flex flex-wrap gap-1.5">
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                  {cr.status}
                                </span>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                  {cr.review_status}
                                </span>
                              </div>
                            </div>
                            <p className="mt-1 text-xs text-jv-muted">{cr.description}</p>
                            {cr.photos.length > 0 && (
                              <p className="mt-1 text-[11px] text-jv-muted">
                                Photo: {cr.photos[0]} · not verified
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 text-xs text-amber-900">
                        Pending review — not treated as verified evidence.
                      </p>
                    </div>
                  )}
                  {evidence.length > 0 && <div className="mt-5"><EvidenceCards items={evidence} /></div>}
                </>
              ))}

            {activeTab === 'Financials' && (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
                <MoneyTrail items={moneyTrail} />
                {financialReview ? (
                  <FinancialPanel amount={financialReview.amount} message={financialReview.message} />
                ) : (
                  <p className="text-sm text-jv-muted">
                    No financial documentation pending review for this project.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'Timeline' && <TimelineWidget events={timeline} />}

            {activeTab === 'Map' && (
              <div className="h-80 overflow-hidden rounded-2xl border border-jv-border sm:h-96">
                <LeafletMap projects={[project]} center={project.min} />
              </div>
            )}
          </div>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-80">
          <TrustMeshPanel
            decision={decision.state}
            message={decision.message}
            progress={progress}
            view={decision}
            href={`/projects/${project.id}`}
            onViewEvidence={() => setActiveTab('Evidence')}
          />
          {financialReview && (
            <FinancialPanel amount={financialReview.amount} message={financialReview.message} />
          )}
          {extras?.fraudscope && (
            <FraudScopePanel
              status={extras.fraudscope.status}
              summary={extras.fraudscope.summary}
              findings={extras.fraudscope.findings}
              onViewEvidence={() => setEvidenceViewerOpen(true)}
            />
          )}
          <QuickActions />
        </aside>
      </div>

      <EvidenceViewerModal
        open={evidenceViewerOpen}
        onClose={() => setEvidenceViewerOpen(false)}
      />
    </section>
  )
}