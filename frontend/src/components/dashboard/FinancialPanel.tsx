import { FileSearch } from 'lucide-react'

interface FinancialPanelProps {
  amount: string
  message: string
}

export default function FinancialPanel({ amount, message }: FinancialPanelProps) {
  return (
    <section
      aria-label="Financial review"
      className="rounded-2xl border border-rose-500/30 bg-white p-5 shadow-sm"
    >
      <div className="flex items-center gap-2 pb-2">
        <FileSearch className="h-4 w-4 text-rose-500" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-wider text-jv-muted">
          Financial Documentation
        </p>
      </div>
      <p
        data-testid="financial-review-amount"
        className="text-3xl font-bold tracking-tight text-jv-navy"
      >
        {amount}
      </p>
      <p className="mt-1 text-sm text-jv-muted">{message}</p>
    </section>
  )
}