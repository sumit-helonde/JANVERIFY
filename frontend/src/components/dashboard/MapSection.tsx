import { Layers } from 'lucide-react'

import type { Project } from '../../data/mockDashboard'
import { CATEGORY_LEGEND } from '../../data/mockDashboard'
import LeafletMap from './LeafletMap'

export default function MapSection({ projects = [] }: { projects?: Project[] }) {
  return (
    <section aria-label="Project map" className="mx-auto max-w-7xl px-4 lg:px-6">
      <div className="overflow-hidden rounded-2xl border border-jv-border bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-jv-navy">
              Projects across Nagpur
            </h2>
            <p className="text-xs text-jv-muted">
              {projects.length} projects · 8 categories · location markers
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-jv-border bg-slate-50 px-3 py-1.5 text-xs font-medium text-jv-muted">
            <Layers className="h-3.5 w-3.5" aria-hidden />
            Live map
          </span>
        </div>

        <div className="relative h-80 w-full sm:h-96 lg:h-[420px]">
          <LeafletMap projects={projects} />
          <div className="pointer-events-none absolute bottom-4 left-4 rounded-xl border border-jv-border bg-white/95 p-3 shadow-sm">
            <p className="pb-2 text-xs font-semibold uppercase tracking-wider text-jv-muted">
              Categories
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {CATEGORY_LEGEND.map((cat) => (
                <span
                  key={cat.label}
                  className="inline-flex items-center gap-1.5 text-xs text-jv-navy"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: cat.color }}
                    aria-hidden
                  />
                  {cat.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}