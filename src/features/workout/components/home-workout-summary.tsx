import { useMemo } from 'react'
import { cn } from 'cn'
import { Dumbbell } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { OfflineState } from '@/components/offline-state'
import { Skeleton } from '@/components/ui/skeleton'
import { FUTURE_CLASSES, LEVEL_CLASSES, TODAY_CLASSES } from '@/features/workout/components/heatmap-styles'
import { PendingBadge } from '@/features/workout/components/pending-badge'
import { useRecentWorkouts, useWorkoutHistory } from '@/features/workout/hooks/use-workout-history'
import {
  countTrainingDaysThisWeek,
  currentWeek,
  dayTotals,
  formatWeekCount,
  formatWorkoutWhen,
  heatmapLevel,
  latestWorkout,
  type DayTotal,
} from '@/features/workout/lib/history'
import { useNow } from '@/hooks/use-now'
import { isWaitingForNetwork } from '@/lib/query-state'

// The content of Home's Workout card (rule AX): the last workout on one line,
// and this week in 7 squares with "3 esta semana". The card's title is the only
// link (see ModuleCard); the squares are only to look at. In the main chunk, so
// nothing here brings the Workout tab's sheets (the drawer) with it.
export function HomeWorkoutSummary() {
  const now = useNow()
  const recent = useRecentWorkouts()
  const history = useWorkoutHistory()
  const totals = useMemo(() => dayTotals(recent.records ?? []), [recent.records])

  // As everywhere, data shows whenever there is some, and the states only when
  // there is nothing to show. The week needs the 12 weeks' read.
  if (!recent.records) {
    if (isWaitingForNetwork(recent.query)) return <OfflineState />
    if (recent.query.isError) return <ErrorState onRetry={() => void recent.query.refetch()} />
    return <SummarySkeleton />
  }

  const latest = latestWorkout(recent.records, history.records ?? [])
  if (!latest) {
    // An empty 12 weeks is not "no workouts" until the history says so too.
    if (!history.records && history.query.isPending && !isWaitingForNetwork(history.query)) return <SummarySkeleton />
    return (
      <EmptyState
        icon={Dumbbell}
        title="Ainda não registaste nenhum treino"
        description="Aqui vais ver o teu último treino e os dias em que treinaste."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* The routine on its own line, truncated, so a long name never hides
          when the workout was and how long it took. */}
      <div className="flex flex-col gap-0.5">
        <div className="flex h-5 min-w-0 items-center gap-2">
          <p className="truncate text-sm font-medium">
            <span className="sr-only">Último treino: </span>
            {latest.routineName}
          </p>
          {latest.pending && <PendingBadge />}
        </div>
        <p className="h-5 truncate text-sm text-muted-foreground">{formatWorkoutWhen(latest, now)}</p>
      </div>
      {/* The count on its own line below the squares, at every width: beside
          them, "Ainda não treinaste esta semana" does not fit, and the card
          would grow when the data arrives. */}
      <div className="flex flex-col gap-2">
        <WeekSquares now={now} totals={totals} />
        <p className="h-5 truncate text-sm text-muted-foreground">
          {formatWeekCount(countTrainingDaysThisWeek(now, totals))}
        </p>
      </div>
    </div>
  )
}

// Only to look at, so hidden from screen readers: the text beside it says it.
function WeekSquares({ now, totals }: { now: Date; totals: Map<string, DayTotal> }) {
  return (
    <div aria-hidden className="flex h-4 gap-1">
      {currentWeek(now).map((day) => (
        <span
          key={day.day}
          className={cn(
            'size-4 rounded-[3px]',
            day.isFuture
              ? FUTURE_CLASSES
              : [LEVEL_CLASSES[heatmapLevel(totals.get(day.day)?.sets ?? 0)], day.isToday && TODAY_CLASSES],
          )}
        />
      ))}
    </div>
  )
}

// The same rows as the card with data (the routine, when, the squares, the
// count), so nothing moves when it arrives.
function SummarySkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-3">
      <span className="sr-only">A carregar…</span>
      <div aria-hidden className="flex flex-col gap-0.5">
        <div className="flex h-5 items-center">
          <Skeleton className="h-4 w-44 max-w-full" />
        </div>
        <div className="flex h-5 items-center">
          <Skeleton className="h-3.5 w-28" />
        </div>
      </div>
      <div aria-hidden className="flex flex-col gap-2">
        {/* As wide as the 7 squares: 7 × 16px + 6 × 4px. */}
        <Skeleton className="h-4 w-34" />
        <div className="flex h-5 items-center">
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  )
}
