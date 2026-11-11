import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { Card } from '@/components/ui/card'
import { PendingBadge } from '@/features/workout/components/pending-badge'
import { useRecentWorkouts, useWorkoutHistory } from '@/features/workout/hooks/use-workout-history'
import { formatLastWorkoutDetails, latestWorkout } from '@/features/workout/lib/history'
import { useNow } from '@/hooks/use-now'

// "Último treino" at the bottom of Home, as in the "Graphite" mockup: one row
// that opens the workout's detail. The last workout comes from the 12 weeks and
// the history together, so one older than 12 weeks still shows. Without
// workouts (or before either read has data) there is no row; it is the last
// block, so it moves nothing when it appears.
export function LastWorkoutRow() {
  const now = useNow()
  const recent = useRecentWorkouts()
  const history = useWorkoutHistory()
  const latest = latestWorkout(recent.records ?? [], history.records ?? [])
  if (!latest) return null

  return (
    <Card className="gap-0 py-0">
      {/* The ring is inset: the card clips anything outside it. */}
      <Link
        to={`/treino/historico/${latest.id}`}
        className="flex min-h-16 touch-manipulation items-center gap-3 px-4 py-3 outline-none select-none transition-[opacity,background-color] duration-150 ease-out hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset active:opacity-70 motion-reduce:transition-none"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm text-muted-foreground">Último treino</span>
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-base font-semibold">{latest.routineName}</span>
            {latest.pending && <PendingBadge />}
          </span>
          <span className="text-sm text-muted-foreground">{formatLastWorkoutDetails(latest, now)}</span>
        </div>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
      </Link>
    </Card>
  )
}
