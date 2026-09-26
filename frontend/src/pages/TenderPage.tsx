import { FileStack, HardHat, Link2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { EmptyState, ErrorState, LoadingPanel } from '../components/ui/AsyncState'
import { KeyValueRow, PageHeader, SectionCard } from '../components/ui/PageBits'
import { fetchTender } from '../lib/api'
import { useResourceWithParam } from '../hooks/useResource'

export default function TenderPage() {
  const { id = '' } = useParams()
  const { data, isLoading, isError, error, refetch } = useResourceWithParam(
    ['tender'],
    id,
    fetchTender,
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
          message={error?.message ?? `Tender ${id} could not be loaded.`}
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <PageHeader
        eyebrow="Tender"
        title={data.department}
        subtitle={`${data.id} · ${data.reference}`}
      />

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <SectionCard title="Tender details">
            <dl>
              <KeyValueRow label="Tender ID" value={data.id} />
              <KeyValueRow label="Tender reference" value={data.reference} />
              <KeyValueRow label="Department" value={data.department} />
              <KeyValueRow label="Tender date" value={data.tenderDate} />
              <KeyValueRow label="Award date" value={data.awardDate} />
              <KeyValueRow label="Estimated value" value={data.estimatedValue} />
              <KeyValueRow
                label="Contractor"
                value={
                  <Link
                    to={`/contractors/${data.contractorId}`}
                    className="inline-flex items-center gap-1 text-jv-blue hover:underline"
                  >
                    <Link2 className="h-3.5 w-3.5" aria-hidden />
                    {data.contractor}
                  </Link>
                }
              />
              <KeyValueRow label="Contract amount" value={data.contractAmount} />
              <KeyValueRow label="Duration" value={data.duration} />
              <KeyValueRow label="Work order" value={data.workOrder} />
            </dl>
          </SectionCard>

          <div className="mt-5">
            <SectionCard
              title="Contractor"
              icon={<HardHat className="h-4 w-4 text-jv-blue" aria-hidden />}
            >
              <Link
                to={`/contractors/${data.contractorId}`}
                className="block rounded-xl border border-jv-border bg-slate-50 p-4 transition-colors hover:border-jv-blue hover:bg-white"
              >
                <p className="text-sm font-semibold text-jv-navy">{data.contractor}</p>
                <p className="mt-0.5 text-xs text-jv-muted">
                  Awarded {data.contractAmount} · {data.duration}
                </p>
              </Link>
            </SectionCard>
          </div>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-80">
          <SectionCard
            title="Documents"
            icon={<FileStack className="h-4 w-4 text-jv-blue" aria-hidden />}
          >
            {data.documents.length === 0 ? (
              <EmptyState title="No documents" message="No documents attached to this tender." />
            ) : (
              <ul className="space-y-2.5">
                {data.documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center gap-2 rounded-lg border border-jv-border bg-slate-50 px-3 py-2"
                  >
                    <FileStack className="h-4 w-4 shrink-0 text-jv-muted" aria-hidden />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-jv-navy">{doc.title}</p>
                      <p className="text-xs text-jv-muted">{doc.type}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <p className="text-[10px] uppercase tracking-wider text-jv-muted">
            Tender records are synthetic for the reference build.
          </p>
        </aside>
      </div>
    </div>
  )
}