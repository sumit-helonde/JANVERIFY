import { FilePlus2, HardHat } from 'lucide-react'
import { useParams } from 'react-router-dom'

import ProjectDetail, { type ProjectTimelineEvent } from '../components/dashboard/ProjectDetail'
import ProjectCard from '../components/dashboard/ProjectCard'
import EvidenceGraph from '../components/project/EvidenceGraph'
import {
  EvidenceSummary,
  FinancialBars,
  IntelligenceHeader,
  MoneyTrailFlow,
  ProgressComparison,
} from '../components/project/Intelligence'
import { ErrorState, LoadingCards, LoadingPanel } from '../components/ui/AsyncState'
import { EntityLink, KeyValueRow, SectionCard } from '../components/ui/PageBits'
import {
  evidenceCardsFromApi,
  fetchEvidenceGraph,
  fetchFraudscope,
  fetchProject,
  fetchProjectDecision,
  fetchProjectEvidence,
  fetchProjectTimeline,
  fetchProjectEvidenceSummary,
  fetchRelatedProjects,
  fetchTender,
  formatCrore,
  moneyTrailFromDetail,
  projectDecisionLabel,
} from '../lib/api'
import { useResourceWithParam } from '../hooks/useResource'

export default function ProjectPage() {
  const { id = '' } = useParams()

  const projectQuery = useResourceWithParam(['project'], id, fetchProject)
  const relatedQuery = useResourceWithParam(['related'], id, fetchRelatedProjects)
  const evidenceQuery = useResourceWithParam(['evidence'], id, fetchProjectEvidence)
  const timelineQuery = useResourceWithParam(['timeline'], id, fetchProjectTimeline)
  const decisionQuery = useResourceWithParam(['decision'], id, fetchProjectDecision)
  const graphQuery = useResourceWithParam(['evidence-graph'], id, fetchEvidenceGraph)
  const fraudscopeQuery = useResourceWithParam(['fraudscope'], id, fetchFraudscope)
  const summaryQuery = useResourceWithParam(['evidence-summary'], id, fetchProjectEvidenceSummary)
  const tenderQuery = useResourceWithParam(
    ['project-tender'],
    projectQuery.data?.tenderId ?? '',
    fetchTender,
  )

  if (projectQuery.isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <LoadingPanel />
      </div>
    )
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <ErrorState
          message={
            projectQuery.error?.message ?? `Project ${id} could not be loaded.`
          }
          onRetry={() => projectQuery.refetch()}
        />
      </div>
    )
  }

  const project = projectQuery.data
  const related = relatedQuery.data ?? []
  const tender = tenderQuery.data

  const evidenceData = evidenceQuery.data
  const reviewClaim = evidenceData?.government_claims.find(
    (c) => c.status === 'under_review' || c.type === 'financial_documentation',
  )

  let earlier = 0
  let latest = 0
  if (evidenceData) {
    const percents = evidenceData.progress_reports
      .map((r) => r.verified_percent)
      .filter((p): p is number => p != null)
    if (percents.length > 0) {
      earlier = Math.min(...percents)
      latest = Math.max(...percents)
    }
  }

  const timeline: ProjectTimelineEvent[] | undefined = timelineQuery.data
    ? timelineQuery.data.events.flatMap((e) =>
        e.date ? [{ date: e.date, type: e.type, title: e.title }] : [],
      )
    : undefined

  const financials = project.financials
  const moneySteps: Array<{ label: string; value: string; caption?: string }> = [
    { label: 'Sanctioned', value: project.sanctioned, caption: 'Government sanctioned budget' },
    {
      label: 'Tender',
      value: tender?.estimatedValue ?? 'Data unavailable',
      caption: tender ? `Tender ${project.tender} · published ${tender.tenderDate}` : undefined,
    },
    {
      label: 'Contractor',
      value: project.contractor,
      caption: project.contractorId ? `Awarded vendor ${project.contractorId}` : undefined,
    },
    {
      label: 'Contract',
      value: project.contract,
      caption: tender?.workOrder ? `Work order ${tender.workOrder}` : 'Contract signed with award amount',
    },
    { label: 'Released', value: project.released, caption: 'Funds released to date' },
    { label: 'Recorded expenditure', value: project.expenditure, caption: 'Expenditure recorded on record' },
    { label: 'Physical progress', value: `${project.govProgress}%`, caption: 'Government reported development progress' },
  ]
  if (project.dataSource === 'REAL_PUBLIC') {
    for (const step of moneySteps) {
      if (step.value === '—' || step.value === 'Data unavailable') {
        step.value = 'Not publicly available'
      }
    }
  }

  const barItems = financials
    ? [
        { label: 'Sanctioned', value: project.sanctioned, fraction: 1 },
        {
          label: 'Contract',
          value: project.contract,
          fraction: financials.sanctioned && financials.contract ? financials.contract / financials.sanctioned : 0,
        },
        {
          label: 'Released',
          value: project.released,
          fraction: financials.sanctioned && financials.released ? financials.released / financials.sanctioned : 0,
        },
        {
          label: 'Recorded expenditure',
          value: project.expenditure,
          fraction: financials.sanctioned && financials.expenditure ? financials.expenditure / financials.sanctioned : 0,
        },
      ]
    : []
  if (project.dataSource === 'REAL_PUBLIC') {
    for (const item of barItems) {
      if (item.value === '—') item.value = 'Not publicly available'
    }
  }

  const progressData = {
    gov: project.govProgress,
    earlier: earlier || null,
    latest: latest || null,
  }

  const evidenceSummaryData = evidenceData
    ? {
        records: evidenceData.evidence.length,
        inspections: evidenceData.inspections.length,
        claims: evidenceData.government_claims.length,
        documents: evidenceData.documents.length,
      }
    : { records: null, inspections: null, claims: null, documents: null }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      <IntelligenceHeader eyebrow={project.id} />

      {project.dataSource === 'REAL_PUBLIC' && (
        <div className="mt-3 rounded-2xl border border-emerald-600/20 bg-emerald-50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
              REAL PUBLIC DATA — NAGPUR
            </span>
            <span className="text-xs text-emerald-900">
              Sourced from public records; not part of the synthetic demo dataset.
            </span>
          </div>
          {project.sourceName && (
            <p className="mt-2 text-xs text-emerald-900">
              Source: {project.sourceName}
              {project.sourceTitle && (
                <a
                  href={project.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-1 font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
                >
                  {project.sourceTitle}
                </a>
              )}
            </p>
          )}
          {project.photos && project.photos.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {project.photos.map((photo, i) => (
                <figure
                  key={`${photo.imageUrl}-${i}`}
                  className="w-56 overflow-hidden rounded-xl border border-emerald-600/20 bg-white"
                >
                  <a href={photo.imageFilePage} target="_blank" rel="noreferrer">
                    <img
                      src={photo.imageUrl}
                      alt={photo.caption ?? `${project.name} photograph`}
                      className="h-32 w-full object-cover"
                      loading="lazy"
                    />
                  </a>
                  <figcaption className="p-2 text-[10px] leading-snug text-jv-muted">
                    {photo.caption}
                    {photo.isRepresentative && (
                      <span className="block font-medium text-jv-navy">
                        Representative image — not project evidence.
                      </span>
                    )}
                    {photo.imageType && (
                      <span className="block">
                        Image type: {photo.imageType.replace(/_/g, ' ')}
                      </span>
                    )}
                    {photo.attribution && (
                      <span className="block">Author: {photo.attribution}</span>
                    )}
                    {photo.licenseInfo && (
                      <span className="block">License: {photo.licenseInfo}</span>
                    )}
                    {photo.imageDate && photo.imageDate !== 'Not recorded' && (
                      <span className="block">Image date: {photo.imageDate}</span>
                    )}
                    {photo.sourceName && (
                      <span className="block">Source: {photo.sourceName}</span>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-jv-border bg-white p-5 shadow-sm lg:col-span-1">
          <MoneyTrailFlow steps={moneySteps} />
        </div>
        <div className="flex flex-col gap-5 lg:col-span-2">
          <FinancialBars items={barItems} />
          {project.progressMissing ? (
            <div className="rounded-2xl border border-jv-border bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-jv-navy">Progress</h3>
              <p className="mt-2 text-sm text-jv-muted">
                Progress data not publicly available for this real public-data project.
              </p>
            </div>
          ) : (
            <ProgressComparison data={progressData} />
          )}
        </div>
      </div>

      {project.dataSource === 'REAL_PUBLIC' && project.sources && project.sources.length > 0 && (
        <div className="mt-5 rounded-2xl border border-jv-border bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-jv-navy">Sources</h3>
          <div className="mt-3 space-y-3">
            {project.sources.map((s) => (
              <div key={`${s.sourceOrder}-${s.url}`} className="rounded-xl border border-jv-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-mono font-semibold text-emerald-700">
                    SOURCE {String(s.sourceOrder).padStart(2, '0')}
                  </span>
                  <span className="text-jv-muted">{s.documentType}</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-jv-navy">{s.organization}</p>
                <p className="text-sm text-jv-muted">{s.title}</p>
                <div className="mt-1 flex flex-wrap gap-x-4 text-[10px] text-jv-muted">
                  {s.publishedDate && <span>Published / issued: {s.publishedDate}</span>}
                  {s.retrievedDate && <span>Retrieved: {s.retrievedDate}</span>}
                </div>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
                >
                  Open source
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5">
        <EvidenceSummary data={evidenceSummaryData} />
      </div>

      <div className="mt-5">
        {graphQuery.isLoading ? (
          <div className="rounded-2xl border border-jv-border bg-white p-5 text-sm text-jv-muted shadow-sm">
            Loading evidence graph…
          </div>
        ) : graphQuery.isError || !graphQuery.data ? (
          <div className="rounded-2xl border border-jv-border bg-white p-5 text-sm text-jv-muted shadow-sm">
            Evidence graph unavailable. Data unavailable at this time.
          </div>
        ) : (
          <EvidenceGraph data={graphQuery.data} />
        )}
      </div>

      <ProjectDetail
        project={project}
        eyebrow={project.id}
        extras={{
          moneyTrail: moneyTrailFromDetail(project),
          evidence: evidenceData ? evidenceCardsFromApi(evidenceData) : undefined,
          citizenReports: evidenceData?.citizen_reports ?? [],
          evidenceSummary: summaryQuery.data,
          timeline,
          decision: decisionQuery.data
            ? {
                state: projectDecisionLabel(decisionQuery.data.state),
                message: decisionQuery.data.reason,
                summary: decisionQuery.data.summary,
                supporting: decisionQuery.data.supporting,
                conflicting: decisionQuery.data.conflicting,
                missing: decisionQuery.data.missing,
                sources: decisionQuery.data.sources,
              }
            : undefined,
          progress: { gov: project.govProgress, earlier, latest },
          financialReview:
            reviewClaim && reviewClaim.amount != null
              ? {
                  amount: formatCrore(reviewClaim.amount),
                  message: `Claim ${reviewClaim.reference} (${reviewClaim.type.replace(/_/g, ' ')}) is under review — supporting documents pending.`,
                }
              : undefined,
          fraudscope: fraudscopeQuery.data
            ? {
                status: fraudscopeQuery.data.status,
                summary: fraudscopeQuery.data.summary,
                findings: fraudscopeQuery.data.findings,
              }
            : undefined,
        }}
      />

      <section className="mx-auto max-w-7xl px-4 pb-10 lg:px-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <SectionCard
            title="Contractor"
            icon={<HardHat className="h-4 w-4 text-jv-blue" aria-hidden />}
          >
            <EntityLink
              to={`/contractors/${project.contractorId}`}
              title={project.contractor}
              subtitle={`${project.contractorId} · Registered works for ${project.department}`}
              meta="View contractor page"
            />
            <p className="mt-3 border-t border-jv-border pt-3 text-[10px] uppercase tracking-wider text-jv-muted">
              Records are verified against the awarded contract value {project.contract}
            </p>
          </SectionCard>

          <SectionCard
            title="Tender"
            icon={<FilePlus2 className="h-4 w-4 text-jv-blue" aria-hidden />}
          >
            <EntityLink
              to={`/tenders/${project.tenderId}`}
              title={project.tender}
              subtitle={`Awarded through ${project.department} · Est. value announced in tender`}
              meta="View tender page"
            />
            {tender ? (
              <dl className="mt-3 space-y-1.5 border-t border-jv-border pt-3">
                <KeyValueRow label="Tender date" value={tender.tenderDate} />
                <KeyValueRow label="Award / contract date" value={tender.awardDate} />
                <KeyValueRow label="Contract amount" value={tender.contractAmount} />
                <KeyValueRow label="Contract duration" value={tender.duration} />
                <KeyValueRow label="Work order" value={tender.workOrder} />
              </dl>
            ) : (
              <p className="mt-3 border-t border-jv-border pt-3 text-[10px] uppercase tracking-wider text-jv-muted">
                Contract amount {project.contract} on tender {project.tender}
              </p>
            )}
          </SectionCard>
        </div>

        <div className="mt-6">
          {relatedQuery.isLoading ? (
            <LoadingCards count={3} />
          ) : relatedQuery.isError || related.length === 0 ? (
            <p className="text-sm text-jv-muted">No related projects available.</p>
          ) : (
            <>
              <h2 className="text-lg font-bold text-jv-navy">Related Projects</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {related.map((p) => (
                  <ProjectCard key={p.id} project={p} linkTo={`/projects/${p.id}`} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}