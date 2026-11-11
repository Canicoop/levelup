import { useId, useMemo, useState } from 'react'
import { cn } from 'cn'
import { useNavigate } from 'react-router'
import { ErrorState } from '@/components/error-state'
import { OfflineState } from '@/components/offline-state'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DayWorkoutsSheet } from '@/features/workout/components/day-workouts-sheet'
import { useRecentWorkouts } from '@/features/workout/hooks/use-workout-history'
import {
  countTrainingDaysThisWeek,
  dayTotals,
  formatHeatmapDayLabel,
  formatWeekCount,
  heatmapLevel,
  heatmapWeeks,
  inHeatmap,
  type HeatmapDay,
  type HeatmapLevel,
} from '@/features/workout/lib/history'
import { useNow } from '@/hooks/use-now'
import { isWaitingForNetwork } from '@/lib/query-state'

// Written out in full so Tailwind finds the class names.
const LEVEL_CLASSES: Record<HeatmapLevel, string> = {
  0: 'bg-heatmap-0',
  1: 'bg-heatmap-1',
  2: 'bg-heatmap-2',
  3: 'bg-heatmap-3',
}

// Shared by every day: the same square, whatever it holds.
const CELL = 'aspect-square w-full rounded-[3px]'
const TODAY = 'ring-2 ring-foreground ring-offset-1 ring-offset-card'

// The 12-week heatmap of the Workout tab (rule AU): one column per week, oldest
// first, and one row per day from Monday to Sunday. The columns shrink to fit
// 320px (about 18px each) and stop at 28px on wide screens. Below 44px the days
// are a shortcut; the history is the main way to a workout.
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
            <div
              role="group"
              aria-labelledby={titleId}
              className="grid grid-flow-col grid-cols-[repeat(12,minmax(0,1.75rem))] grid-rows-7 gap-1"
            >
              {weeks.flat().map((day) => (
                <HeatmapCell key={day.day} day={day} sets={totals.get(day.day)?.sets ?? 0} onOpen={openDay} />
              ))}
            </div>
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

function HeatmapCell({ day, sets, onOpen }: { day: HeatmapDay; sets: number; onOpen: (day: string) => void }) {
  // The rest of this week: empty and set apart, and nothing to read out.
  if (day.isFuture) return <span aria-hidden className={cn(CELL, 'border border-dashed border-border')} />

  const label = formatHeatmapDayLabel(day.day, sets)
  const className = cn(CELL, LEVEL_CLASSES[heatmapLevel(sets)], day.isToday && TODAY)

  // A day without a workout does not react.
  if (sets === 0) {
    return <span role="img" aria-label={label} aria-current={day.isToday ? 'date' : undefined} className={className} />
  }
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={day.isToday ? 'date' : undefined}
      onClick={() => onOpen(day.day)}
      className={cn(
        className,
        'touch-manipulation outline-none transition-transform duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100 motion-reduce:active:opacity-70',
      )}
    />
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
          <Skeleton className="aspect-12/7 w-full max-w-90" />
        </div>
      </Card>
    </div>
  )
}
