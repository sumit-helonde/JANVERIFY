import { AlertTriangle, Inbox, RotateCcw } from 'lucide-react'

export function LoadingCards({ count = 4 }: { count?: number }) {
  return (
    <div data-testid="loading-cards" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-52 animate-pulse rounded-2xl border border-jv-border bg-slate-100"
          aria-hidden
        />
      ))}
    </div>
  )
}

export function LoadingPanel() {
  return (
    <div
      data-testid="loading-panel"
      className="space-y-3"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-7 w-56 animate-pulse rounded-lg bg-slate-100" />
      <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-100" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl border border-jv-border bg-slate-100" />
        ))}
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <div
      data-testid="empty-state"
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-jv-border bg-white px-6 py-16 text-center"
    >
      <Inbox className="h-8 w-8 text-jv-muted" aria-hidden />
      <h3 className="text-base font-semibold text-jv-navy">{title}</h3>
      <p className="max-w-md text-sm text-jv-muted">{message}</p>
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div
      data-testid="error-state"
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-jv-border bg-white px-6 py-16 text-center"
      role="alert"
    >
      <AlertTriangle className="h-8 w-8 text-jv-red" aria-hidden />
      <h3 className="text-base font-semibold text-jv-navy">Could not load this page</h3>
      <p className="max-w-md text-sm text-jv-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-jv-navy px-4 py-2 text-sm font-medium text-white hover:bg-jv-blue"
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
        Retry
      </button>
    </div>
  )
}