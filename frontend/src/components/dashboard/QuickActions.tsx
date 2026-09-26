import {
  Download,
  FilePlus2,
  GitCompareArrows,
  Network,
} from 'lucide-react'

const ACTIONS = [
  { label: 'View Evidence Graph', icon: Network, href: '/projects/NRD-204/evidence-graph' },
  { label: 'Compare Projects', icon: GitCompareArrows, href: '/compare' },
  { label: 'Download Report', icon: Download, href: '/reports' },
  { label: 'Submit Evidence', icon: FilePlus2, href: '/submit-evidence' },
] as const

export default function QuickActions() {
  return (
    <section aria-label="Quick actions" className="rounded-2xl border border-jv-border bg-white p-5 shadow-sm">
      <p className="pb-3 text-xs font-semibold uppercase tracking-wider text-jv-muted">
        Quick Actions
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <a
              key={action.label}
              href={action.href}
              className="inline-flex items-center gap-2 rounded-lg border border-jv-border bg-slate-50 px-3 py-2.5 text-sm font-medium text-jv-navy transition-colors hover:border-jv-blue hover:bg-jv-blue/5 hover:text-jv-blue"
            >
              <Icon className="h-4 w-4 shrink-0 text-jv-blue" aria-hidden />
              {action.label}
            </a>
          )
        })}
      </div>
    </section>
  )
}