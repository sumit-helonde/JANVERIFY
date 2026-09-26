import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import ProjectCard from '../components/dashboard/ProjectCard'
import { EmptyState, ErrorState, LoadingCards } from '../components/ui/AsyncState'
import { useSearchQuery } from '../context/SearchContext'
import { fetchProjects } from '../lib/api'
import { useResource } from '../hooks/useResource'

type DataSourceFilter = 'ALL' | 'REAL_PUBLIC' | 'SYNTHETIC'

const DATA_SOURCE_OPTIONS: Array<{ value: DataSourceFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'REAL_PUBLIC', label: 'Real Public Data' },
  { value: 'SYNTHETIC', label: 'Synthetic Hackathon Data' },
]

export default function ProjectsPage() {
  const { query } = useSearchQuery()
  const [params] = useSearchParams()
  const category = params.get('category') ?? ''
  const [dataSource, setDataSource] = useState<DataSourceFilter>('ALL')
  const [onlyWithImages, setOnlyWithImages] = useState(false)

  const {
    data: projects = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useResource(['projects'], fetchProjects)

  const visibleProjects = useMemo(() => {
    const q = query.trim().toLowerCase()
    return projects.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      const matchesCategory = !category || p.category === category
      const matchesSource = dataSource === 'ALL' || (p.dataSource ?? 'SYNTHETIC') === dataSource
      const matchesImage = !onlyWithImages || (p.photos?.length ?? 0) > 0
      return matchesSearch && matchesCategory && matchesSource && matchesImage
    })
  }, [projects, query, category, dataSource, onlyWithImages])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-jv-navy">Projects</h1>
          <p className="mt-1 text-sm text-jv-muted">
            Every public project in the registry, with money trail and evidence state.
          </p>
        </div>
        {category && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-jv-border bg-white px-3 py-1 text-xs font-semibold text-jv-navy">
            Category: {category}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-jv-muted">
          Data Source
        </span>
        <div className="inline-flex rounded-full border border-jv-border bg-white p-0.5">
          {DATA_SOURCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDataSource(opt.value)}
              aria-pressed={dataSource === opt.value}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                dataSource === opt.value
                  ? 'bg-jv-blue text-white'
                  : 'text-jv-muted hover:text-jv-navy'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-1.5 text-xs font-medium text-jv-muted">
          <input
            type="checkbox"
            checked={onlyWithImages}
            onChange={(e) => setOnlyWithImages(e.target.checked)}
            className="h-3.5 w-3.5 accent-jv-blue"
          />
          Has project image
        </label>
      </div>

      {dataSource === 'REAL_PUBLIC' && visibleProjects.length > 0 && (
        <div className="mt-3 rounded-xl border border-emerald-600/20 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800">
          Showing real public projects for Nagpur with verifiable sources. Images from Wikimedia Commons may be
          representative and are not project evidence.
        </div>
      )}

      <div className="mt-6">
        {isLoading ? (
          <LoadingCards count={4} />
        ) : isError ? (
          <ErrorState message={error?.message ?? 'Something went wrong.'} onRetry={() => refetch()} />
        ) : visibleProjects.length === 0 ? (
          <EmptyState
            title="No projects found"
            message="No projects match this category or search. Try clearing filters."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {visibleProjects.map((project) => (
              <ProjectCard key={project.id} project={project} linkTo={`/projects/${project.id}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}