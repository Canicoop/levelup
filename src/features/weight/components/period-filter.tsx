import type { Period } from '@/features/weight/lib/periods'

const PERIODS: { value: Period; label: string }[] = [
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '1A', label: '1A' },
  { value: 'all', label: 'Tudo' },
]

type PeriodFilterProps = {
  value: Period
  onChange: (period: Period) => void
}

// The period of the summary and the chart: one row of four 44px buttons above
// what they scope. The history is not filtered. As in iOS segmented controls,
// the selected one is the surface with the main text and a hairline: quieter
// than the primary action, so the filter never competes with the weight. In
// the dark theme the surface is darker than the neutral fill around it and
// would read as sunken, so the selection uses the border colour, a step
// lighter than that fill.
export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <div role="group" aria-label="Período" className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
      {PERIODS.map((period) => {
        const selected = period.value === value
        return (
          <button
            key={period.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(period.value)}
            className={`min-h-11 touch-manipulation rounded-lg text-sm font-medium outline-none select-none transition-[opacity,background-color,color] duration-150 ease-out focus-visible:ring-3 focus-visible:ring-ring active:opacity-70 motion-reduce:transition-none ${
              selected
                ? 'bg-card text-foreground ring-1 ring-border dark:bg-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {period.label}
          </button>
        )
      })}
    </div>
  )
}
