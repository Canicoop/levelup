import { useId, useMemo, useState } from 'react'
import { cn } from 'cn'
import { Link } from 'react-router'
import { ErrorState } from '@/components/error-state'
import { OfflineState } from '@/components/offline-state'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { HeatmapDayDetails } from '@/features/workout/components/heatmap-day-details'
import { HeatmapBarsSkeleton, HeatmapGrid } from '@/features/workout/components/heatmap-grid'
import { useActiveWorkout } from '@/features/workout/hooks/use-active-workout'
import { useRecentWorkouts } from '@/features/workout/hooks/use-workout-history'
import { useRoutines } from '@/features/workout/hooks/use-workout-queries'
import {
  countTrainingDays,
  countTrainingDaysThisWeek,
  dayTotals,
  formatHeatmapSummary,
  formatWeekGoal,
  heatmapWeeks,
  inHeatmap,
} from '@/features/workout/lib/history'
import { useNow } from '@/hooks/use-now'
import { isWaitingForNetwork } from '@/lib/query-state'

// The top of Home, as in the "Graphite" mockup (rules AX and AV): this week
// against the goal ("2 de 5 treinos"), the 12 weeks, where tapping a day shows
// its workouts below, and the way into a workout. The goal is the number of
// active routines; the count is the days with a workout this week, the ones
// waiting to be sent included. No sheet, so the drawer stays out of the main
// chunk.
export function HomeWeekCard() {
  const now = useNow()
  const titleId = useId()
  const recent = useRecentWorkouts()
  const routines = useRoutines()
  const workout = useActiveWorkout()

  const [selected, setSelected] = useState<string | null>(null)

  const totals = useMemo(() => dayTotals(recent.records ? inHeatmap(recent.records, now) : []), [recent.records, now])
  const weeks = heatmapWeeks(now)
  // A day that left the 12 weeks (a new week while the app stayed open) is no
  // longer selected.
  const selectedDay = selected && weeks.flat().some((day) => day.day === selected && !day.isFuture) ? selected : null
  // Unknown while the routines load; without them (an error, or no network and
  // no copy) the headline goes on without a goal.
  const goal = routines.data ? routines.data.filter((routine) => !routine.archived_at).length : null
  const goalPending = routines.isPending && !routines.isError && !isWaitingForNetwork(routines)
  const headline = recent.records && !goalPending ? formatWeekGoal(countTrainingDaysThisWeek(now, totals), goal) : null
  // Without the 12 weeks and no hope of them for now (no network, or an
  // error), a still dash instead of a skeleton that would pulse for good.
  const stalled = !recent.records && (isWaitingForNetwork(recent.query) || recent.query.isError)

  return (
    <section aria-labelledby={titleId}>
      <Card>
        <div className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-0.5">
            <h2 id={titleId} className="text-sm text-muted-foreground">
              Esta semana
            </h2>
            <div className="flex min-h-8 items-end justify-between gap-3">
              {headline ? (
                <p className="text-2xl font-semibold tracking-tight tabular-nums">{headline}</p>
              ) : stalled ? (
                <p aria-hidden className="text-2xl font-semibold tracking-tight text-muted-foreground">
                  —
                </p>
              ) : (
                <div aria-hidden className="flex h-8 items-center">
                  <Skeleton className="h-6 w-36" />
                </div>
              )}
              <p className="shrink-0 pb-1 text-xs text-muted-foreground">12 semanas</p>
            </div>
          </div>

          {recent.records ? (
            <div className="flex flex-col gap-3">
              <p className="sr-only">{formatHeatmapSummary(countTrainingDays(totals))}</p>
              <HeatmapGrid weeks={weeks} totals={totals} selected={selectedDay} onSelect={setSelected} />
              <HeatmapDayDetails day={selectedDay} workouts={selectedDay ? (totals.get(selectedDay)?.workouts ?? []) : []} />
            </div>
          ) : isWaitingForNetwork(recent.query) ? (
            <OfflineState />
          ) : recent.query.isError ? (
            <ErrorState onRetry={() => void recent.query.refetch()} />
          ) : (
            <div aria-busy="true" className="flex flex-col gap-3">
              <span className="sr-only">A carregar…</span>
              <HeatmapBarsSkeleton />
              {/* The day's line keeps its space while loading too. */}
              <div aria-hidden className="min-h-17" />
            </div>
          )}

          <Link
            to={workout ? '/treino/em-curso' : '/treino'}
            className={cn(buttonVariants({ size: 'lg' }), 'h-12 w-full rounded-xl text-base pointer-coarse:h-12')}
          >
            {workout ? 'Continuar treino' : 'Iniciar treino'}
          </Link>
        </div>
      </Card>
    </section>
  )
}
