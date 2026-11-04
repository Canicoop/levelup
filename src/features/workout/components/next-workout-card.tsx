import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChooseRoutineSheet } from '@/features/workout/components/choose-routine-sheet'
import { useStartWorkout } from '@/features/workout/hooks/use-start-workout'
import { useLastRoutineId, useRoutines } from '@/features/workout/hooks/use-workout-queries'
import { getErrorMessage } from '@/features/workout/lib/errors'
import { formatExerciseCount } from '@/features/workout/lib/labels'
import { nextRoutine } from '@/features/workout/lib/next-routine'

// The suggested routine, at the top of the Workout tab. Without active routines
// there is nothing to suggest, and the list below offers to create one.
export function NextWorkoutCard() {
  const routines = useRoutines()
  const lastRoutineId = useLastRoutineId()
  const start = useStartWorkout()
  const [choosing, setChoosing] = useState(false)

  if (!routines.data) return null

  // Only an actual request is waited for: paused without network, or failed,
  // the suggestion goes on without the last workout.
  if (lastRoutineId.isPending && lastRoutineId.fetchStatus === 'fetching') {
    return (
      <Card aria-busy="true">
        <div className="flex flex-col gap-3 px-4">
          <span className="sr-only">A carregar…</span>
          <Skeleton aria-hidden className="h-4 w-24" />
          <Skeleton aria-hidden className="h-6 w-40" />
          <Skeleton aria-hidden className="h-9 w-full" />
        </div>
      </Card>
    )
  }

  const routine = nextRoutine(routines.data, lastRoutineId.data ?? null)
  if (!routine) return null

  const empty = routine.exercise_count === 0

  return (
    <Card>
      <div className="flex flex-col gap-3 px-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-muted-foreground">Próximo treino</p>
          <p className="text-lg font-semibold wrap-break-word">{routine.name}</p>
          <p className="text-sm text-muted-foreground">{formatExerciseCount(routine.exercise_count)}</p>
        </div>
        {empty && (
          <p className="text-sm text-muted-foreground">
            Esta rotina não tem exercícios.{' '}
            <Link
              to={`/treino/rotinas/${routine.id}`}
              className="rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring"
            >
              Abrir rotina
            </Link>
          </p>
        )}
        {start.error && (
          <p role="alert" className="text-sm text-destructive">
            {getErrorMessage(start.error)}
          </p>
        )}
        <div className="flex flex-col gap-1">
          <Button
            size="lg"
            className="w-full"
            disabled={empty || start.isPending}
            onClick={() => start.mutate(routine.id)}
          >
            {start.isPending ? 'A começar…' : 'Iniciar treino'}
          </Button>
          <Button variant="ghost" className="w-full" disabled={start.isPending} onClick={() => setChoosing(true)}>
            Escolher outra rotina
          </Button>
        </div>
      </div>
      <ChooseRoutineSheet
        open={choosing}
        onOpenChange={setChoosing}
        routines={routines.data.filter((item) => !item.archived_at)}
      />
    </Card>
  )
}
