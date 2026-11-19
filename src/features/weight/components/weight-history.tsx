import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { historyRows, type WeightEntry } from '@/features/weight/lib/entries'
import { formatHistoryDay } from '@/features/weight/lib/labels'
import { formatDifference, formatWeight } from '@/features/weight/lib/weight-values'
import type { DayKey } from '@/lib/lisbon-day'

// Rows shown at first and added by each "Ver mais". Every entry is already in
// memory, so "Ver mais" asks for nothing; it only keeps a year of entries from
// becoming one very long page.
const PAGE_SIZE = 30

type WeightHistoryProps = {
  entries: WeightEntry[]
  today: DayKey
  // Today's entry opens its edit sheet; an older one, the sheet to delete it.
  onOpen: (entry: WeightEntry) => void
}

// The "Histórico" section: newest first, each entry with its difference from
// the one before it.
export function WeightHistory({ entries, today, onOpen }: WeightHistoryProps) {
  const titleId = useId()
  const [shown, setShown] = useState(PAGE_SIZE)
  const rows = historyRows(entries)

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center">
        <h2 id={titleId} className="text-xl font-semibold tracking-tight">
          Histórico
        </h2>
      </div>
      <Card className="gap-0 py-0">
        <ul className="divide-y divide-border">
          {rows.slice(0, shown).map(({ entry, difference }) => (
            <li key={entry.id}>
              {/* The ring is inset: the card clips anything outside it. */}
              <button
                type="button"
                onClick={() => onOpen(entry)}
                className="flex min-h-14 w-full touch-manipulation items-center justify-between gap-3 px-4 py-2 text-left outline-none select-none transition-[opacity,background-color] duration-150 ease-out hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset active:opacity-70 motion-reduce:transition-none"
              >
                <span className="min-w-0 text-base">{formatHistoryDay(entry.day, today)}</span>
                <span className="flex shrink-0 flex-col items-end tabular-nums">
                  <span className="text-base font-medium">{formatWeight(entry.tenths)}</span>
                  {difference !== null && (
                    <span className="text-sm text-muted-foreground">{formatDifference(difference)}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
      {rows.length > shown && (
        <Button variant="outline" size="lg" className="w-full" onClick={() => setShown((count) => count + PAGE_SIZE)}>
          Ver mais
        </Button>
      )}
    </section>
  )
}

export function WeightHistorySkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center">
        <Skeleton className="h-6 w-24" />
      </div>
      <Card className="gap-0 py-0">
        <div className="divide-y divide-border">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
              <Skeleton className="h-4 w-24" />
              <div className="flex flex-col items-end gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3.5 w-12" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
