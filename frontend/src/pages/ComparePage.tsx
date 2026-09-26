import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, ShieldCheck } from 'lucide-react'

import { EmptyState, ErrorState, LoadingPanel } from '../components/ui/AsyncState'
import { SectionCard } from '../components/ui/PageBits'
import { useResource } from '../hooks/useResource'
import { fetchCompare, type CompareFilters, type CompareGroupRow } from '../lib/api'

const CRORE = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 })

function MetricCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-jv-border bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-jv-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-jv-navy">{value}</p>
      {note && <p className="mt-1 text-[11px] leading-4 text-jv-muted">{note}</p>}
    </div>
  )
}

function GroupTable({ title, rows }: { title: string; rows: [string, CompareGroupRow][] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-jv-muted">No projects match the selected filters.</p>
  }
  return (
    <SectionCard title={title}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-jv-muted">
            <tr>
              <th className="py-2 pr-4 font-semibold">Group</th>
              <th className="py-2 pr-4 font-semibold">Projects</th>
              <th className="py-2 pr-4 font-semibold">Completed</th>
              <th className="py-2 pr-4 font-semibold">Delayed</th>
              <th className="py-2 pr-4 font-semibold">Sanctioned (₹ Cr)</th>
              <th className="py-2 pr-4 font-semibold">Contract (₹ Cr)</th>
              <th className="py-2 pr-4 font-semibold">Expenditure (₹ Cr)</th>
              <th className="py-2 pr-4 font-semibold">Evidence %</th>
              <th className="py-2 font-semibold">Inspection %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-jv-border">
            {rows.map(([name, r]) => (
              <tr key={name}>
                <td className="py-2 pr-4 font-semibold text-jv-navy">{name}</td>
                <td className="py-2 pr-4">{r.projects}</td>
                <td className="py-2 pr-4">{r.completed}</td>
                <td className="py-2 pr-4">{r.delayed}</td>
                <td className="py-2 pr-4">{CRORE.format(r.sanctioned)}</td>
                <td className="py-2 pr-4">{CRORE.format(r.contract)}</td>
                <td className="py-2 pr-4">{CRORE.format(r.expenditure)}</td>
                <td className="py-2 pr-4">{r.evidence_completeness_pct}%</td>
                <td className="py-2">{r.inspection_coverage_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}

export default function ComparePage() {
  const [filters, setFilters] = useState<CompareFilters>({})

  const key = useMemo(
    () => ['compare', filters.city ?? '', filters.category ?? '', filters.department ?? '', filters.from ?? '', filters.to ?? ''],
    [filters],
  )
  const compare = useResource(key, () => fetchCompare(filters))

  const set = (patch: Partial<CompareFilters>) => setFilters((f) => ({ ...f, ...patch }))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-jv-blue">Compare</p>
            <h1 className="mt-1 text-2xl font-bold text-jv-navy">Neutral project measurement</h1>
            <p className="mt-1 max-w-2xl text-sm text-jv-muted">
              Measurable infrastructure data only. No rankings, no winners or losers, no political judgements —
              every metric is calculated from on-record project evidence for the selected period.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-jv-navy/5 px-3 py-1 text-xs font-semibold text-jv-navy">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Independent · Non-partisan
          </span>
        </div>

        <SectionCard title="Filters">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <label className="text-xs font-semibold text-jv-muted">
              City / location
              <input
                type="text"
                list="compare-cities"
                value={filters.city ?? ''}
                onChange={(e) => set({ city: e.target.value || undefined })}
                placeholder="All cities"
                className="mt-1 w-full rounded-lg border border-jv-border bg-white px-3 py-2 text-sm text-jv-navy"
              />
            </label>
            <datalist id="compare-cities">
              {compare.data?.filter_options.cities.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <label className="text-xs font-semibold text-jv-muted">
              Project category
              <select
                value={filters.category ?? ''}
                onChange={(e) => set({ category: e.target.value || undefined })}
                className="mt-1 w-full rounded-lg border border-jv-border bg-white px-3 py-2 text-sm text-jv-navy"
              >
                <option value="">All categories</option>
                {compare.data?.filter_options.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-jv-muted">
              Department
              <select
                value={filters.department ?? ''}
                onChange={(e) => set({ department: e.target.value || undefined })}
                className="mt-1 w-full rounded-lg border border-jv-border bg-white px-3 py-2 text-sm text-jv-navy"
              >
                <option value="">All departments</option>
                {compare.data?.filter_options.departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-jv-muted">
              From date
              <input
                type="date"
                value={filters.from ?? ''}
                onChange={(e) => set({ from: e.target.value || undefined })}
                className="mt-1 w-full rounded-lg border border-jv-border bg-white px-3 py-2 text-sm text-jv-navy"
              />
            </label>
            <label className="text-xs font-semibold text-jv-muted">
              To date
              <input
                type="date"
                value={filters.to ?? ''}
                onChange={(e) => set({ to: e.target.value || undefined })}
                className="mt-1 w-full rounded-lg border border-jv-border bg-white px-3 py-2 text-sm text-jv-navy"
              />
            </label>
          </div>
        </SectionCard>

        {compare.isLoading && <div className="mt-6"><LoadingPanel /></div>}
        {compare.isError && (
          <div className="mt-6">
            <ErrorState message="Compare metrics could not be loaded from the backend." onRetry={() => void compare.refetch()} />
          </div>
        )}
        {compare.isSuccess && compare.data?.summary.total_projects === 0 && (
          <div className="mt-6">
            <EmptyState title="No projects match these filters" message="Try clearing one or more filters to see comparison data." />
          </div>
        )}
        {compare.isSuccess && compare.data && compare.data.summary.total_projects > 0 && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4" data-testid="compare-metrics">
              <MetricCard label="Total projects" value={String(compare.data.summary.total_projects)} note="Matching the selected filters." />
              <MetricCard label="Completed" value={String(compare.data.summary.completed)} />
              <MetricCard label="Delayed" value={String(compare.data.summary.delayed)} />
              <MetricCard label="Average delay" value={`${compare.data.summary.average_delay_days != null ? `${compare.data.summary.average_delay_days} days` : '—'}`} note={compare.data.metric_notes.average_delay_days} />
              <MetricCard label="Sanctioned" value={`₹${CRORE.format(compare.data.summary.sanctioned)} Cr`} />
              <MetricCard label="Contract" value={`₹${CRORE.format(compare.data.summary.contract)} Cr`} />
              <MetricCard label="Recorded expenditure" value={`₹${CRORE.format(compare.data.summary.expenditure)} Cr`} />
              <MetricCard label="Evidence completeness" value={`${compare.data.summary.evidence_completeness_pct}%`} note={compare.data.metric_notes.evidence_completeness_pct} />
              <MetricCard label="Inspection coverage" value={`${compare.data.summary.inspection_coverage_pct}%`} note={compare.data.metric_notes.inspection_coverage_pct} />
              <MetricCard label="Evidence records" value={String(compare.data.summary.evidence_count)} />
              <MetricCard label="Inspection records" value={String(compare.data.summary.inspection_count)} />
              <div className="flex flex-col justify-center rounded-2xl border border-jv-border bg-jv-blue/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-jv-muted">Explore</p>
                <Link to="/projects" className="mt-1 text-sm font-semibold text-jv-blue hover:underline">
                  <BarChart3 className="mr-1 inline h-4 w-4" aria-hidden />
                  All projects
                </Link>
                <Link to="/reports" className="mt-1 text-sm font-semibold text-jv-blue hover:underline">
                  View project reports
                </Link>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <GroupTable title="Breaking down by category" rows={Object.entries(compare.data.by_category)} />
              <GroupTable title="Breaking down by department" rows={Object.entries(compare.data.by_department)} />
            </div>
            <p className="mt-4 text-xs text-jv-muted">
              All figures are derived from the JANVERIFY database ({' '}
              {compare.data.filters_applied.city ?? 'all cities'} · {compare.data.filters_applied.category ?? 'all categories'} ·{' '}
              {compare.data.filters_applied.department ?? 'all departments'} ·{' '}
              {compare.data.filters_applied.from ?? 'any start'} → {compare.data.filters_applied.to ?? 'any start'}). Not an official government statement.
            </p>
          </>
        )}
    </div>
  )
}