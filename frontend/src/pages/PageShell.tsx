import { Compass, Lightbulb } from 'lucide-react'

import { EmptyState, ErrorState, LoadingPanel } from '../components/ui/AsyncState'
import { PageHeader, SectionCard, SyntheticBadge } from '../components/ui/PageBits'
import { fetchPageInfo } from '../lib/api'
import { useResource } from '../hooks/useResource'

export default function PageShell({ slug }: { slug: string }) {
  const { data, isLoading, isError, error, refetch } = useResource(
    ['page', slug],
    () => fetchPageInfo(slug),
  )

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <LoadingPanel />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <ErrorState
          message={error?.message ?? 'This page could not be loaded.'}
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <PageHeader title={data.title} subtitle={data.description} right={<SyntheticBadge />} />

      <div className="mt-6">
        {data.sections.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            message="This section is planned. Check back after the next build phase."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.sections.map((section, i) => (
              <SectionCard key={section.id} title={section.title}>
                <p className="text-sm text-jv-muted">{section.description}</p>
                <p className="mt-4 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-jv-muted">
                  {i === 0 ? (
                    <Compass className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Lightbulb className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Planned capability · phase roadmap
                </p>
              </SectionCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}