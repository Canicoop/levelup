import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { todayEntry, type WeightEntry } from '@/features/weight/lib/entries'
import { formatSummaryLine } from '@/features/weight/lib/labels'
import type { DayKey } from '@/features/weight/lib/lisbon-day'
import { periodSummary } from '@/features/weight/lib/periods'
import { formatKg } from '@/features/weight/lib/weight-values'

type WeightSummaryProps = {
  // Never empty: the page shows the empty state instead.
  entries: WeightEntry[]
  today: DayKey
  onRegister: () => void
  onEditToday: (entry: WeightEntry) => void
}

// The current weight and its difference from the period's first entry. The
// period is 1M until the chart's filter controls it (step 6.6). The difference
// is neutral text: with no goal, neither direction is good or bad.
export function WeightSummary({ entries, today, onRegister, onEditToday }: WeightSummaryProps) {
  const titleId = useId()
  const { current, difference, since } = periodSummary(entries, '1M', today)
  const logged = todayEntry(entries, today)
  if (!current) return null

  return (
    <section aria-labelledby={titleId}>
      <Card>
        <div className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-sm text-muted-foreground">
              Peso atual
            </h2>
            <p className="text-4xl font-semibold tracking-tight tabular-nums">
              {formatKg(current.tenths)}
              <span className="ml-1 text-xl font-medium text-muted-foreground">kg</span>
            </p>
            <p className="text-sm text-pretty text-muted-foreground tabular-nums">
              {formatSummaryLine(current.day, difference, since, today)}
            </p>
          </div>
          {logged ? (
            <Button variant="outline" size="lg" className="w-full" onClick={() => onEditToday(logged)}>
              Editar peso de hoje
            </Button>
          ) : (
            <Button size="lg" className="w-full" onClick={onRegister}>
              Registar peso
            </Button>
          )}
        </div>
      </Card>
    </section>
  )
}

export function WeightSummarySkeleton() {
  return (
    <Card aria-hidden>
      <div className="flex flex-col gap-4 px-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-full pointer-coarse:h-11" />
      </div>
    </Card>
  )
}
