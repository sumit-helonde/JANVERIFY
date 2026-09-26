import { ArrowDown, Wallet } from 'lucide-react'

export interface MoneyTrailItem {
  value?: string
  label: string
}

export default function MoneyTrail({
  items = [],
}: {
  items?: MoneyTrailItem[]
}) {
  const trail = items.length > 0 ? items : [{ value: '—', label: 'No financial trace available yet' }]
  return (
    <div className="rounded-2xl border border-jv-border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 pb-4">
        <Wallet className="h-4 w-4 text-jv-blue" aria-hidden />
        <h3 className="text-sm font-semibold text-jv-navy">Money Trail</h3>
      </div>
      <ol className="space-y-0">
        {trail.map((step, index) => (
          <li key={`${step.label}-${index}`}>
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-jv-border bg-slate-50 text-[11px] font-bold text-jv-navy">
                {index + 1}
              </span>
              <div className="flex flex-1 items-baseline justify-between gap-2 py-1">
                <span className="text-sm text-jv-muted">{step.label}</span>
                {step.value && (
                  <span className="text-sm font-semibold text-jv-navy">
                    {step.value}
                  </span>
                )}
              </div>
            </div>
            {index < trail.length - 1 && (
              <div className="ml-4 flex h-5 items-center">
                <ArrowDown className="h-4 w-4 text-jv-border" aria-hidden />
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}