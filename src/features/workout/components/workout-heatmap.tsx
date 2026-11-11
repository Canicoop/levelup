import { useId, useMemo, useState } from 'react'
import { cn } from 'cn'
import { useNavigate } from 'react-router'
import { ErrorState } from '@/components/error-state'
import { OfflineState } from '@/components/offline-state'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DayWorkoutsSheet } from '@/features/workout/components/day-workouts-sheet'
import { HeatmapGrid } from '@/features/workout/components/heatmap-grid'
import { LEVEL_CLASSES } from '@/features/workout/components/heatmap-styles'
import { useRecentWorkouts } from '@/features/workout/hooks/use-workout-history'
import {
  countTrainingDaysThisWeek,
  dayTotals,
  formatWeekCount,
  heatmapWeeks,
  inHeatmap,
} from '@/features/workout/lib/history'
import { useNow } from '@/hooks/use-now'
import { isWaitingForNetwork } from '@/lib/query-state'

// The 12-week heatmap of the Workout tab (rule AU): one column per week, oldest
// first, and one row per day from Monday to Sunday. The columns fill the card,
// shrinking to fit 320px (about 16px each) and stopping at 44px, the touch
// target size, so on a tablet or desktop each day is a full target. Filling a
// desktop card completely would mean squares of about 66px and a heatmap taller
// than the rest of the tab. Below 44px the days are a shortcut; the history is
// the main way to a workout.
export function WorkoutHeatmap() {
  const now = useNow()
  const navigate = useNavigate()
  const { query, records } = useRecentWorkouts()
  const titleId = useId()
  const [sheetOpen, setSheetOpen] = useState(false)
  // The day stays set while the sheet closes.
  const [sheetDay, setSheetDay] = useState<string | null>(null)

  const totals = useMemo(() => dayTotals(records ? inHeatmap(records, now) : []), [records, now])
  const weeks = heatmapWeeks(now)

  // A day with one workout opens it; with more, a sheet with that day's.
  function openDay(day: string) {
    const workouts = totals.get(day)?.workouts ?? []
    if (workouts.length === 1) void navigate(`/treino/historico/${workouts[0].id}`)
    else if (workouts.length > 1) {
      setSheetDay(day)
      setSheetOpen(true)
    }
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      {/* The count goes below the title when both do not fit (320px with
          "Ainda não treinaste esta semana"). */}
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
        <h2 id={titleId} className="text-xl font-semibold tracking-tight">
          Últimas 12 semanas
        </h2>
        {records && (
          <p className="text-sm text-muted-foreground">
            {formatWeekCount(countTrainingDaysThisWeek(now, totals))}
          </p>
        )}
      </div>

      {records ? (
        <Card>
          {/* As wide as the grid, so the legend ends where the grid does on wide
              screens; max-w-full lets the columns shrink on a phone. */}
          <div className="mx-4 flex w-fit max-w-[calc(100%-2rem)] flex-col gap-3">
            <HeatmapGrid variant="squares" weeks={weeks} totals={totals} labelledBy={titleId} onOpen={openDay} />
            <Legend />
          </div>
        </Card>
      ) : isWaitingForNetwork(query) ? (
        <OfflineState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : (
        <HeatmapSkeleton />
      )}

      {sheetDay && (
        <DayWorkoutsSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          day={sheetDay}
          workouts={totals.get(sheetDay)?.workouts ?? []}
          now={now}
        />
      )}
    </section>
  )
}

// "Menos ▢▢▢▢ Mais". The swatches are for the eye; each day reads its sets.
function Legend() {
  return (
    <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
      <span className="mr-1">Menos</span>
      {([0, 1, 2, 3] as const).map((level) => (
        <span key={level} aria-hidden className={cn('size-3 rounded-xs', LEVEL_CLASSES[level])} />
      ))}
      <span className="ml-1">Mais</span>
    </div>
  )
}

function HeatmapSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">A carregar…</span>
      <Card aria-hidden>
        <div className="px-4">
          {/* As wide as the grid at most: 12 × 44px + 11 × 6px. */}
          <Skeleton className="aspect-12/7 w-full max-w-[37.125rem]" />
        </div>
      </Card>
    </div>
  )
}
