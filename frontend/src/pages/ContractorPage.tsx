import {
  Award,
  CalendarClock,
  ClipboardCheck,
  FileStack,
  FolderKanban,
  HandCoins,
  MapPin,
  ScrollText,
  Wallet,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { EmptyState, ErrorState, LoadingPanel } from '../components/ui/AsyncState'
import { PageHeader, SectionCard } from '../components/ui/PageBits'
import { fetchContractor } from '../lib/api'
import { useResourceWithParam } from '../hooks/useResource'

function statusPill(status: string) {
  const tone =
    status === 'Active' || status === 'Paid' || status === 'Closed'
      ? 'bg-jv-green/10 text-jv-green'
      : status === 'Ongoing' || status === 'Reviewed'
        ? 'bg-jv-blue/10 text-jv-blue'
        : 'bg-amber-500/10 text-amber-700'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      {status}
    </span>
  )
}

export default function ContractorPage() {
  const { id = '' } = useParams()
  const { data, isLoading, isError, error, refetch } = useResourceWithParam(
    ['contractor'],
    id,
    fetchContractor,
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
          message={error?.message ?? `Contractor ${id} could not be loaded.`}
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <PageHeader
        eyebrow="Contractor"
        title={data.name}
        subtitle={`${data.id} · ${data.location}`}
      />

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-jv-border bg-slate-50 px-3 py-2.5">
          <p className="text-xs text-jv-muted">Registration</p>
          <p className="text-sm font-bold text-jv-navy">{data.registration}</p>
        </div>
        <div className="rounded-xl border border-jv-border bg-slate-50 px-3 py-2.5">
          <p className="text-xs text-jv-muted">Established</p>
          <p className="text-sm font-bold text-jv-navy">{data.established ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-jv-border bg-slate-50 px-3 py-2.5">
          <p className="text-xs text-jv-muted">Specialization</p>
          <p className="text-sm font-bold text-jv-navy">{data.specialization}</p>
        </div>
        <div className="rounded-xl border border-jv-border bg-slate-50 px-3 py-2.5">
          <p className="text-xs text-jv-muted">Location</p>
          <p className="flex items-center gap-1 text-sm font-bold text-jv-navy">
            <MapPin className="h-3.5 w-3.5 text-jv-blue" aria-hidden />
            {data.location.split(',')[0]}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard
          title="Projects"
          icon={<FolderKanban className="h-4 w-4 text-jv-blue" aria-hidden />}
        >
          {data.projects.length === 0 ? (
            <EmptyState title="No projects" message="No projects linked to this contractor." />
          ) : (
            <ul className="divide-y divide-jv-border">
              {data.projects.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <Link
                      to={`/projects/${p.id}`}
                      className="text-sm font-semibold text-jv-navy hover:text-jv-blue"
                    >
                      {p.name}
                    </Link>
                    <p className="text-xs text-jv-muted">
                      {p.category} · {p.role} · {p.value}
                    </p>
                  </div>
                  {statusPill(p.status)}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Contracts"
          icon={<ScrollText className="h-4 w-4 text-jv-blue" aria-hidden />}
        >
          {data.contracts.length === 0 ? (
            <EmptyState title="No contracts" message="No contracts on record." />
          ) : (
            <ul className="divide-y divide-jv-border">
              {data.contracts.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-jv-navy">{c.projectName}</p>
                    <p className="text-xs text-jv-muted">
                      {c.id} · Signed {c.signed} · {c.amount}
                    </p>
                  </div>
                  {statusPill(c.status)}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Awards"
          icon={<Award className="h-4 w-4 text-jv-blue" aria-hidden />}
        >
          {data.awards.length === 0 ? (
            <EmptyState title="No awards" message="No award records for this contractor." />
          ) : (
            <ul className="divide-y divide-jv-border">
              {data.awards.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-jv-navy">{a.title}</p>
                    <p className="text-xs text-jv-muted">{a.projectName} · {a.date}</p>
                  </div>
                  <span className="text-sm font-bold text-jv-navy">{a.value}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Payments"
          icon={<Wallet className="h-4 w-4 text-jv-blue" aria-hidden />}
        >
          {data.payments.length === 0 ? (
            <EmptyState title="No payments" message="No payment records on file." />
          ) : (
            <ul className="divide-y divide-jv-border">
              {data.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-jv-navy">{p.projectName}</p>
                    <p className="text-xs text-jv-muted">{p.id} · {p.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-jv-navy">{p.amount}</span>
                    {statusPill(p.status)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Delays"
          icon={<CalendarClock className="h-4 w-4 text-jv-blue" aria-hidden />}
        >
          {data.delays.length === 0 ? (
            <EmptyState title="No delays" message="No delay records reported." />
          ) : (
            <ul className="divide-y divide-jv-border">
              {data.delays.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-jv-navy">{d.projectName}</p>
                    <p className="text-xs text-jv-muted">{d.id} · {d.days} days · {d.reason}</p>
                  </div>
                  {statusPill(d.status)}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Inspection records"
          icon={<ClipboardCheck className="h-4 w-4 text-jv-blue" aria-hidden />}
        >
          {data.inspections.length === 0 ? (
            <EmptyState title="No inspections" message="No inspection records found." />
          ) : (
            <ul className="divide-y divide-jv-border">
              {data.inspections.map((ins) => (
                <li key={ins.id} className="py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-jv-navy">{ins.projectName}</p>
                    <p className="text-xs text-jv-muted">{ins.id} · {ins.date}</p>
                  </div>
                  <p className="mt-1 text-xs text-jv-muted">{ins.finding}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Documentation"
          icon={<FileStack className="h-4 w-4 text-jv-blue" aria-hidden />}
        >
          {data.documents.length === 0 ? (
            <EmptyState title="No documents" message="No documents on record." />
          ) : (
            <ul className="divide-y divide-jv-border">
              {data.documents.map((doc) => (
                <li key={doc.id} className="flex items-center gap-2 py-2.5">
                  <HandCoins className="h-4 w-4 shrink-0 text-jv-muted" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-jv-navy">{doc.title}</p>
                    <p className="text-xs text-jv-muted">{doc.type} · {doc.date}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  )
}