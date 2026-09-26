import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  GitCompareArrows,
  MapPin,
  Megaphone,
  Search,
  ShieldAlert,
  User,
} from 'lucide-react'

import {
  CATEGORIES,
  FEATURED_PROJECT_REFERENCE,
  SYNTHETIC_LABEL,
  type Project,
} from '../data/mockDashboard'
import {
  CATEGORY_COUNTS,
  FEATURED_CARDS,
  HERO_IMAGE,
  OVERVIEW,
  PHOTO_STRIP,
  QUICK_INSIGHTS,
  SIDE_TICKERS,
  type FeaturedCard,
} from '../data/dashboardContent'
import { useSearchQuery } from '../context/SearchContext'
import { CIVICWATCH_SUMMARY } from '../data/civicWatchData'
import DashboardImage from '../components/dashboard/DashboardImage'
import LeafletMap from '../components/dashboard/LeafletMap'
import ProjectCard from '../components/dashboard/ProjectCard'
import { EmptyState, ErrorState, LoadingCards } from '../components/ui/AsyncState'
import {
  fetchDashboardSummary,
  fetchProject,
  fetchProjectEvidenceSummary,
  fetchProjects,
  formatCrore,
  moneyTrailFromDetail,
} from '../lib/api'
import { useResource, useResourceWithParam } from '../hooks/useResource'

const FALLBACK_EVIDENCE = {
  progress: { government: 85, earlier_inspection: 63, latest_inspection: 82 },
  trustmesh: { state: 'CONFLICTING', summary: "The records don't fully agree yet." },
  fraudscope: { status: 'HUMAN_REVIEW_REQUIRED', review_amount: '\u20B98.2 Cr' },
  counts: { evidence: 0, citizen_reports: 0 },
}

function DashboardHero() {
  const { query, setQuery } = useSearchQuery()
  const [value, setValue] = useState(query)

  return (
    <section className="border-b border-jv-border bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-jv-blue/10 px-3 py-1 text-xs font-semibold text-jv-blue">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {OVERVIEW.badge}
              </span>
              <span
                data-testid="synthetic-badge"
                className="rounded-full bg-jv-mint px-3 py-1 text-xs font-bold text-jv-navy"
              >
                {SYNTHETIC_LABEL}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-bold leading-tight text-jv-navy sm:text-4xl lg:text-5xl">
              {OVERVIEW.heading}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-jv-muted sm:text-base">
              {OVERVIEW.subtitle}
            </p>

            <form
              role="search"
              className="mt-6 flex max-w-xl items-center gap-2 rounded-xl border border-jv-border bg-white p-1.5 shadow-sm"
              onSubmit={(e) => {
                e.preventDefault()
                setQuery(value)
              }}
            >
              <Search className="ml-2 h-4 w-4 shrink-0 text-jv-muted" aria-hidden />
              <input
                type="search"
                aria-label="Hero project search"
                placeholder={OVERVIEW.searchPlaceholder}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-jv-navy placeholder:text-jv-muted focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-jv-blue px-4 py-2 text-sm font-semibold text-white hover:bg-jv-blue/90"
              >
                Search
              </button>
            </form>

            <div
              className="mt-8 grid max-w-xl grid-cols-3 gap-3"
              data-testid="hero-stats"
            >
              {OVERVIEW.stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-jv-border bg-slate-50 px-4 py-3 text-center"
                >
                  <div className="text-xl font-bold tabular-nums text-jv-navy sm:text-2xl">
                    {s.value}
                  </div>
                  <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-jv-muted sm:text-xs">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden flex-col xl:flex">
            <DashboardImage
              asset={HERO_IMAGE}
              alt={HERO_IMAGE.caption}
              fallbackLabel="Nagpur infrastructure"
              className="h-56 w-full rounded-2xl border border-jv-border shadow-sm"
              showBadge
            />
            <p className="mt-2 text-[10px] text-jv-muted">
              Nagpur · representative infrastructure photo · {HERO_IMAGE.license}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function PhotoStrip() {
  return (
    <section
      aria-label="Project photo strip"
      className="mx-auto max-w-7xl px-4 lg:px-6"
    >
      <div className="flex snap-x gap-3 overflow-x-auto pb-1">
        {PHOTO_STRIP.map((img, i) => (
          <DashboardImage
            key={`${img.attribution}-${i}`}
            asset={img}
            alt={img.caption}
            fallbackLabel="Infrastructure"
            className="h-24 w-56 shrink-0 snap-start rounded-xl border border-jv-border sm:h-28 sm:w-64"
            showBadge
          />
        ))}
      </div>
      <p className="mt-1 text-[10px] text-jv-muted">
        Representative photos: Wikimedia Commons ({PHOTO_STRIP.map((i) => i.license).join(', ')}) — not project evidence.
      </p>
    </section>
  )
}

function NagpurOverview({ projects }: { projects: Project[] }) {
  return (
    <section aria-label="Nagpur Overview" className="rounded-2xl border border-jv-border bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-jv-border px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-jv-blue" aria-hidden />
            <h2 className="text-base font-semibold text-jv-navy">Nagpur Overview</h2>
          </div>
          <p className="mt-0.5 text-xs text-jv-muted">
            {projects.length} projects loaded · live map with project markers
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-jv-border bg-slate-50 px-3 py-1.5 text-xs font-medium text-jv-muted">
          {SYNTHETIC_LABEL}
        </span>
      </div>
      <div className="relative h-72 w-full sm:h-80">
        <LeafletMap projects={projects} />
      </div>
    </section>
  )
}

function QuickInsights() {
  return (
    <section aria-label="Quick Insights" className="rounded-2xl border border-jv-border bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-jv-navy">Quick Insights</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_INSIGHTS.map((insight) => (
          <div key={insight.label} className="rounded-xl border border-jv-border bg-slate-50 px-3 py-4 text-center">
            <div className="text-lg font-bold tabular-nums text-jv-navy">{insight.value}</div>
            <div className="mt-1 text-[11px] font-medium text-jv-muted">{insight.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function CategoryCards() {
  return (
    <section aria-label="Project categories" className="rounded-2xl border border-jv-border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-jv-navy">Projects by Category</h2>
        <Link to="/projects" className="inline-flex items-center gap-1 text-xs font-semibold text-jv-blue hover:underline">
          View all <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {CATEGORY_COUNTS.map((cat) => (
          <Link
            key={cat.label}
            to={`/projects?category=${encodeURIComponent(cat.label)}`}
            className="group flex items-center gap-3 rounded-xl border border-jv-border bg-white px-3 py-3 transition-colors hover:border-jv-blue/40 hover:bg-jv-blue/5"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: cat.color }}
              aria-hidden
            >
              {cat.label.charAt(0)}
            </span>
            <span>
              <span className="block text-sm font-bold text-jv-navy group-hover:text-jv-blue">{cat.count}</span>
              <span className="block text-xs text-jv-muted">{cat.label}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function FeaturedCard({ card }: { card: FeaturedCard }) {
  const statusStyles: Record<string, string> = {
    'In Progress': 'bg-jv-blue/10 text-jv-blue',
    Completed: 'bg-jv-green/10 text-jv-green',
    Delayed: 'bg-rose-500/10 text-rose-600',
  }

  return (
    <Link
      to={card.href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-jv-border bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <DashboardImage
        asset={card.image}
        alt={card.image.caption}
        fallbackLabel={card.category}
        fallbackColor={card.color}
        className="h-32 w-full"
        showBadge
      />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ backgroundColor: `${card.color}14`, color: card.color }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: card.color }} aria-hidden />
            {card.category}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[card.status]}`}
          >
            {card.status}
          </span>
        </div>

        <h3 className="mt-3 text-sm font-bold leading-snug text-jv-navy group-hover:text-jv-blue">
          {card.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs text-jv-muted">{card.description}</p>

        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-jv-navy">{card.budget}</span>
            <span className="font-semibold text-jv-navy">{card.progress}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${card.progress}%`, backgroundColor: card.color }}
            />
          </div>
        </div>
      </div>
    </Link>
  )
}

function FeaturedProjects() {
  return (
    <section aria-label="Featured projects">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-jv-navy">Featured Projects</h2>
          <p className="text-xs text-jv-muted">
            Signature public infrastructure projects · {SYNTHETIC_LABEL}
          </p>
        </div>
        <Link
          to="/projects"
          className="inline-flex items-center gap-1 rounded-lg border border-jv-border bg-white px-3 py-2 text-xs font-semibold text-jv-navy shadow-sm hover:text-jv-blue"
        >
          Browse all projects <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {FEATURED_CARDS.map((card) => (
          <FeaturedCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  )
}

function StatBox({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-jv-border bg-white p-3 text-center shadow-sm">
      <div className="text-lg font-bold tabular-nums text-jv-navy">
        {value}
        {tone && <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-jv-muted">{tone}</span>}
      </div>
      <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-jv-muted">{label}</div>
    </div>
  )
}

function EvidenceFlow({ progress, trustmeshState }: { progress: number[]; trustmeshState: string }) {
  const steps = [
    { label: 'Government Claim', value: `${progress[0]}%` },
    { label: 'Earlier Inspection', value: `${progress[1]}%` },
    { label: 'Latest Inspection', value: `${progress[2]}%` },
  ]
  return (
    <div className="rounded-xl border border-jv-border bg-slate-50 p-4">
      <p className="pb-2 text-xs font-semibold uppercase tracking-wider text-jv-muted">Evidence flow</p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md bg-jv-navy px-2.5 py-1.5 font-semibold text-white">PROJECT</span>
        {steps.map((s, i) => (
          <span key={s.label} className="flex items-center gap-2">
            <span aria-hidden>→</span>
            <span className="rounded-md bg-white px-2.5 py-1.5 font-semibold text-jv-navy ring-1 ring-jv-border">
              {s.label} <span className="text-jv-blue">{s.value}</span>
            </span>
            {i === steps.length - 1 && <span aria-hidden>→</span>}
          </span>
        ))}
        <span className="rounded-md bg-white px-2.5 py-1.5 font-semibold text-jv-navy ring-1 ring-jv-border">PHOTOS</span>
        <span aria-hidden>→</span>
        <span
          data-testid="trustmesh-state"
          className="rounded-md bg-amber-100 px-2.5 py-1.5 font-bold text-amber-800 ring-1 ring-amber-300"
        >
          TRUSTMESH {trustmeshState}
        </span>
      </div>
      <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs italic text-jv-muted ring-1 ring-jv-border">
        “The records don't fully agree yet.”
      </p>
    </div>
  )
}

function Nrd204Section() {
  const { data: projects = [] } = useResource(['projects'], fetchProjects)
  const featured = projects.find((p) => p.id === FEATURED_PROJECT_REFERENCE) ?? projects[0]
  const featuredQuery = useResourceWithParam(
    ['featured-detail'],
    String(featured?.backendId ?? ''),
    fetchProject,
  )
  const evQuery = useResourceWithParam(
    ['featured-evidence'],
    String(featured?.backendId ?? ''),
    fetchProjectEvidenceSummary,
  )
  const detail = featuredQuery.data
  const evidence = evQuery.data
  const moneyTrail = detail ? moneyTrailFromDetail(detail) : undefined

  const prog = evidence?.progress ?? FALLBACK_EVIDENCE.progress
  const trustmesh = evidence?.trustmesh ?? FALLBACK_EVIDENCE.trustmesh
  const fraud = evidence?.fraudscope ?? FALLBACK_EVIDENCE.fraudscope

  const sanctioned = detail?.financials ? formatCrore(detail.financials.sanctioned) : '\u20B950 Cr'
  const contract = detail?.financials ? formatCrore(detail.financials.contract) : '\u20B947.8 Cr'
  const releasedValue = detail?.financials ? detail.financials.released : 42
  const released = detail?.financials ? formatCrore(detail.financials.released) : '\u20B942 Cr'
  const expenditureValue = detail?.financials ? detail.financials.expenditure : 39
  const expenditure = detail?.financials ? formatCrore(detail.financials.expenditure) : '\u20B939 Cr'
  const govProgress = Math.round(detail?.govProgress ?? prog.government ?? 0)
  const latestInspection = Math.round(detail?.latestInspection ?? prog.latest_inspection ?? 0)
  const department = detail?.department ?? 'Public Works'

  const donutPct = releasedValue > 0 ? Math.min(100, Math.round((expenditureValue / releasedValue) * 100)) : 0
  const donutColor = donutPct >= 90 ? 'stroke-jv-green' : donutPct >= 70 ? 'stroke-jv-blue' : 'stroke-amber-500'
  const C = 2 * Math.PI * 44

  return (
    <section aria-label="Featured project NRD-204" className="overflow-hidden rounded-2xl border border-jv-border bg-white shadow-sm">
      <div className="border-b border-jv-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-jv-navy">{detail?.name ?? 'Ward 24 Road Development'}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-jv-muted">
              <span className="font-mono font-semibold text-jv-blue">NRD-204</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden /> Nagpur, Maharashtra
              </span>
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" aria-hidden /> {department}
              </span>
            </p>
          </div>
          <span className="rounded-full bg-jv-navy px-3 py-1 text-xs font-bold text-jv-mint">
            {SYNTHETIC_LABEL}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-6">
        <StatBox label="Sanctioned" value={sanctioned} />
        <StatBox label="Contract" value={contract} />
        <StatBox label="Released" value={released} />
        <StatBox label="Expenditure" value={expenditure} />
        <StatBox label="Gov Progress" value={`${govProgress}%`} tone="govt" />
        <StatBox label="Latest Inspection" value={`${latestInspection}%`} tone="verified" />
      </div>

      <div className="grid grid-cols-1 gap-4 border-t border-jv-border p-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {moneyTrail && (
            <div className="rounded-xl border border-jv-border bg-slate-50 p-4">
              <p className="pb-2 text-xs font-semibold uppercase tracking-wider text-jv-muted">Money Trail</p>
              <ol className="flex flex-wrap items-center gap-2 text-xs">
                {moneyTrail.map((step, i) => (
                  <li key={step.label} className="flex items-center gap-2">
                    <span className="rounded-md bg-white px-2.5 py-1.5 font-semibold text-jv-navy ring-1 ring-jv-border">
                      {i === 2 && step.value === '—' ? step.label.toUpperCase() : `${step.label}: ${step.value}`}
                    </span>
                    {i < moneyTrail.length - 1 && <span aria-hidden>→</span>}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="mt-4">
            <EvidenceFlow
              progress={[
                prog.government ?? 0,
                prog.earlier_inspection ?? 0,
                prog.latest_inspection ?? 0,
              ]}
              trustmeshState={trustmesh.state}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-jv-border bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-jv-muted">Financial Insight</p>
            <p className="mt-2 text-sm font-bold text-jv-navy">
              <span data-testid="financial-review-amount">{fraud.review_amount}</span> payment has incomplete
              supporting documentation
            </p>
            <p className="mt-1 text-xs text-jv-muted">
              Financial documentation needs review. Status:{' '}
              <span className="font-semibold text-amber-700">{fraud.status.replace(/_/g, ' ')}</span>.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/submit-evidence" className="rounded-lg bg-jv-blue px-3 py-2 text-xs font-semibold text-white hover:bg-jv-blue/90">
                Request Additional Evidence
              </Link>
              <Link to="/submit-evidence" className="rounded-lg border border-jv-blue bg-white px-3 py-2 text-xs font-semibold text-jv-blue hover:bg-jv-blue/5">
                Submit Evidence
              </Link>
              <Link to="/audit-logs" className="rounded-lg border border-jv-border bg-white px-3 py-2 text-xs font-semibold text-jv-navy hover:bg-slate-50">
                View Audit Trail
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-jv-border bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-jv-muted">Where Did the Money Go?</p>
            <div className="mt-3 flex items-center gap-4">
              <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
                <circle cx="50" cy="50" r="44" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  className={donutColor}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(donutPct / 100) * C} ${C}`}
                />
              </svg>
              <div className="text-xs">
                <p className="font-semibold text-jv-navy">{expenditure} spent</p>
                <p className="text-jv-muted">of {released} released</p>
                <p className="mt-1 inline-block rounded bg-white px-2 py-0.5 font-semibold text-jv-navy ring-1 ring-jv-border">
                  {donutPct}% utilised
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CivicWatchCard() {
  return (
    <div className="rounded-2xl border border-jv-border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-jv-blue" aria-hidden />
        <h3 className="text-sm font-bold text-jv-navy">CivicWatch</h3>
      </div>
      <p className="mt-2 text-xs text-jv-muted">
        Public-reported civic issues · see it, report it, track it, verify the fix.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {CIVICWATCH_SUMMARY.metrics.map((m) => (
          <div key={m.label} className="rounded-lg bg-slate-50 px-3 py-2 text-center">
            <div className="text-base font-bold tabular-nums text-jv-navy">{m.value}</div>
            <div className="mt-0.5 text-[10px] font-medium text-jv-muted">{m.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to="/civicwatch?report=1"
          className="rounded-lg bg-jv-blue px-3 py-2 text-xs font-semibold text-white hover:bg-jv-blue/90"
        >
          Report an Issue
        </Link>
        <Link
          to="/civicwatch"
          className="rounded-lg border border-jv-border bg-white px-3 py-2 text-xs font-semibold text-jv-navy hover:text-jv-blue"
        >
          View CivicWatch
        </Link>
      </div>
      <p className="mt-3 text-[10px] leading-4 text-jv-muted">
        Demo metrics · {SYNTHETIC_LABEL}. Not mixed with real public data.
      </p>
    </div>
  )
}

function CompareGovernmentsCard() {
  return (
    <Link to="/compare" className="group block rounded-2xl border border-jv-border bg-white p-5 shadow-sm hover:shadow-md">
      <div className="flex items-center gap-2">
        <GitCompareArrows className="h-4 w-4 text-jv-blue" aria-hidden />
        <h3 className="text-sm font-bold text-jv-navy">{SIDE_TICKERS.compare.title}</h3>
      </div>
      <p className="mt-2 text-xs text-jv-muted">
        {SIDE_TICKERS.compare.city} · {SIDE_TICKERS.compare.scope}
      </p>
      <p className="text-xs text-jv-muted">{SIDE_TICKERS.compare.range}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-jv-blue group-hover:underline">
        View Comparison <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </span>
    </Link>
  )
}

function ContractorCard() {
  return (
    <Link to="/contractors/1" className="group block rounded-2xl border border-jv-border bg-white p-5 shadow-sm hover:shadow-md">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-jv-blue" aria-hidden />
        <h3 className="text-sm font-bold text-jv-navy">{SIDE_TICKERS.contractor.title}</h3>
      </div>
      <p className="mt-2 text-sm font-bold text-jv-navy group-hover:text-jv-blue">
        {SIDE_TICKERS.contractor.fallbackName}
      </p>
      <p className="text-xs text-jv-muted">{SIDE_TICKERS.contractor.subtitle}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-jv-blue group-hover:underline">
        View history <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </span>
    </Link>
  )
}

function ProjectGrid() {
  const { query } = useSearchQuery()
  const { data: projects = [], isLoading, isError } = useResource(['projects'], fetchProjects)

  const visibleProjects = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return projects
    return projects.filter((p) =>
      [p.name, p.category, p.location, p.id].some((v) => v.toLowerCase().includes(q)),
    )
  }, [projects, query])

  return (
    <section aria-label="All projects" className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div>
          <h2 className="text-lg font-bold text-jv-navy">Projects</h2>
          <p className="text-xs text-jv-muted">
            {projects.length} projects · {SYNTHETIC_LABEL}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <Link
              key={c.label}
              to={`/projects?category=${encodeURIComponent(c.label)}`}
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-jv-navy hover:bg-jv-navy hover:text-jv-mint"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>

      {isLoading && projects.length === 0 ? (
        <LoadingCards count={4} />
      ) : isError ? (
        <ErrorState message="Could not load this page" onRetry={() => window.location.reload()} />
      ) : visibleProjects.length === 0 ? (
        <EmptyState title="No projects found" message="No projects match the current view." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {visibleProjects.map((project) => (
            <ProjectCard key={project.id} project={project} linkTo={`/projects/${project.id}`} />
          ))}
        </div>
      )}
    </section>
  )
}

export default function DashboardPage() {
  const { data: summary } = useResource(['dashboard-summary'], fetchDashboardSummary)
  const { data: projects = [] } = useResource(['projects'], fetchProjects)

  return (
    <div className="pb-10">
      <DashboardHero />
      <div className="mx-auto max-w-7xl px-4 pt-5 lg:px-6">
        <PhotoStrip />
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:px-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <NagpurOverview projects={projects} />
          <QuickInsights />
          <CategoryCards />
          <FeaturedProjects />
          <Nrd204Section />
        </div>

        <aside className="min-w-0 space-y-6">
          <CivicWatchCard />
          <CompareGovernmentsCard />
          <ContractorCard />
          <div className="rounded-2xl border border-jv-border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600" aria-hidden />
              <h3 className="text-sm font-bold text-jv-navy">Source &amp; Evidence Trust</h3>
            </div>
            <p className="mt-2 text-xs text-jv-muted">
              Reports here are cross-checked but remain under review. A flag does not confirm fraud — it means
              human review is required.
            </p>
            <div className="mt-3 space-y-1.5 text-xs text-jv-muted">
              <p>Evidence on record: <span className="font-semibold text-jv-navy">{summary?.evidence_count ?? '—'}</span></p>
              <p>Inspections on record: <span className="font-semibold text-jv-navy">{summary?.inspection_count ?? '—'}</span></p>
              <p>Departments: <span className="font-semibold text-jv-navy">{summary?.departments ?? '—'}</span></p>
            </div>
          </div>
        </aside>
      </div>

      <ProjectGrid />
    </div>
  )
}