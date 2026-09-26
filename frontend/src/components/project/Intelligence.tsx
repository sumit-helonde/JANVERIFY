import {
  ArrowDown,
  FilePlus2,
  HardHat,
  Landmark,
  ScrollText,
  UserRound,
  Wallet,
} from 'lucide-react'

export interface MoneyTrailStep {
  label: string
  value: string
  caption?: string
}

const STEP_ICONS = [Landmark, FilePlus2, UserRound, ScrollText, Wallet, ArrowDown, HardHat]

export function MoneyTrailFlow({ steps }: { steps: MoneyTrailStep[] }) {
  return (
    <div>
      <div className="mb-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-jv-navy">
          <Wallet className="h-4 w-4 text-jv-blue" aria-hidden />
          Money Trail
        </h3>
        <p className="text-xs text-jv-muted">
          Where sanctioned public funds were contracted, released and spent.
        </p>
      </div>
      <ol className="flex flex-col">
        {steps.map((step, i) => {
          const Icon = STEP_ICONS[i] ?? Landmark
          const last = i === steps.length - 1
          return (
            <li key={step.label} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-jv-blue/40 bg-jv-blue/10">
                  <Icon className="h-4 w-4 text-jv-blue" aria-hidden />
                </span>
                {!last && <span className="my-1 w-px flex-1 bg-jv-border" />}
              </div>
              <div className={last ? 'pb-1' : 'pb-6'}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-jv-muted">
                  {step.label}
                </p>
                <p className="mt-0.5 text-base font-bold text-jv-navy">{step.value}</p>
                {step.caption ? (
                  <p className="mt-0.5 text-xs text-jv-muted">{step.caption}</p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export interface FinancialBarItem {
  label: string
  value: string
  fraction: number
}

export function FinancialBars({ items }: { items: FinancialBarItem[] }) {
  const anyData = items.some((i) => Number.isFinite(i.fraction) && i.fraction > 0)
  return (
    <div className="rounded-2xl border border-jv-border bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-jv-navy">
        <Landmark className="h-4 w-4 text-jv-blue" aria-hidden />
        Funding at a glance
      </h3>
      <p className="text-xs text-jv-muted">
        Sanctioned vs contracted vs released vs recorded expenditure.
      </p>
      {anyData ? (
        <div className="mt-4 space-y-3.5">
          {items.map((item) => (
            <div key={item.label}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-jv-navy">{item.label}</span>
                <span className="text-sm font-bold text-jv-navy">{item.value}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-jv-blue"
                  style={{ width: `${Math.min(100, Math.max(2, item.fraction * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-jv-muted">Data unavailable</p>
      )}
    </div>
  )
}

export interface ProgressComparisonData {
  gov: number | null
  earlier: number | null
  latest: number | null
}

export function ProgressComparison({ data }: { data: ProgressComparisonData }) {
  const rows = [
    { label: 'Government reported', value: data.gov, tone: 'bg-jv-blue' },
    { label: 'Earlier independent inspection', value: data.earlier, tone: 'bg-slate-400' },
    { label: 'Latest independent inspection', value: data.latest, tone: 'bg-slate-400' },
  ]
  const anyData = rows.some((r) => r.value !== null && Number.isFinite(r.value))
  return (
    <div className="rounded-2xl border border-jv-border bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-jv-navy">
        <ArrowDown className="h-4 w-4 text-jv-blue" aria-hidden />
        Reported progress vs independent inspections
      </h3>
      <p className="text-xs text-jv-muted">
        Neutral comparison of reported and independently measured progress. No conclusion drawn.
      </p>
      {anyData ? (
        <div className="mt-4 space-y-4">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-jv-navy">{row.label}</span>
                <span className="text-sm font-bold text-jv-navy">
                  {row.value !== null ? `${row.value}%` : 'Data unavailable'}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${row.tone}`}
                  style={{
                    width: `${Math.min(100, Math.max(2, (row.value ?? 0) / 100 * 100))}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-jv-muted">Data unavailable</p>
      )}
    </div>
  )
}

export interface EvidenceSummaryData {
  records: number | null
  inspections: number | null
  claims: number | null
  documents: number | null
}

export function EvidenceSummary({ data }: { data: EvidenceSummaryData }) {
  const cells = [
    { label: 'Evidence records', value: data.records },
    { label: 'Inspections', value: data.inspections },
    { label: 'Government claims', value: data.claims },
    { label: 'Documents', value: data.documents },
  ]
  const anyData = cells.some((c) => c.value !== null)
  return (
    <div className="rounded-2xl border border-jv-border bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-jv-navy">
        <ScrollText className="h-4 w-4 text-jv-blue" aria-hidden />
        Evidence availability
      </h3>
      {anyData ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cells.map((cell) => (
            <div key={cell.label} className="rounded-xl border border-jv-border bg-slate-50 px-3 py-2.5">
              <dt className="text-[10px] uppercase tracking-wider text-jv-muted">{cell.label}</dt>
              <dd className="mt-0.5 text-xl font-bold text-jv-navy">
                {cell.value ?? '—'}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-4 text-sm text-jv-muted">No evidence records on record yet.</p>
      )}
    </div>
  )
}

export function IntelligenceHeader({ eyebrow }: { eyebrow: string }) {
  return (
    <div className="mb-5 border-b border-jv-border pb-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-jv-blue">
        Project Intelligence · {eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-bold text-jv-navy">Money, progress and evidence at a glance</h2>
    </div>
  )
}