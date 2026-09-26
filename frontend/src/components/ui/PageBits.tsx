import { Building2, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { SYNTHETIC_LABEL } from '../../data/mockDashboard'

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  right?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-jv-blue">{eyebrow}</p>
        )}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-jv-navy">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-jv-muted">{subtitle}</p>}
      </div>
      {right ?? <SyntheticBadge />}
    </div>
  )
}

export function SyntheticBadge() {
  return (
    <span
      data-testid="synthetic-badge"
      className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700"
    >
      {SYNTHETIC_LABEL}
    </span>
  )
}

export function SectionCard({
  title,
  icon,
  children,
  action,
}: {
  title: string
  icon?: ReactNode
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-jv-border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-jv-navy">
          {icon ?? <ShieldCheck className="h-4 w-4 text-jv-blue" aria-hidden />}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  )
}

export function KeyValueRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-jv-border py-2.5 last:border-0">
      <dt className="text-xs text-jv-muted">{label}</dt>
      <dd className="text-right text-sm font-medium text-jv-navy">{value}</dd>
    </div>
  )
}

export function EntityLink({
  to,
  title,
  subtitle,
  meta,
}: {
  to: string
  title: string
  subtitle?: string
  meta?: string
}) {
  return (
    <Link
      to={to}
      className="block rounded-xl border border-jv-border bg-slate-50 p-4 transition-colors hover:border-jv-blue hover:bg-white"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-jv-navy text-white">
          <Building2 className="h-4 w-4 text-jv-green" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-jv-navy">{title}</p>
          {subtitle && <p className="mt-0.5 text-xs text-jv-muted">{subtitle}</p>}
          {meta && <p className="mt-1 text-[10px] uppercase tracking-wider text-jv-blue">{meta}</p>}
        </div>
      </div>
    </Link>
  )
}