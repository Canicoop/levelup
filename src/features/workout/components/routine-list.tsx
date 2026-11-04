import { useId, useState } from 'react'
import { ChevronRight, ListChecks, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { OfflineState } from '@/components/offline-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArchivedRoutines } from '@/features/workout/components/archived-routines'
import { CreateRoutineSheet } from '@/features/workout/components/create-routine-sheet'
import { ReorderButtons } from '@/features/workout/components/reorder-buttons'
import { useMoveRoutine } from '@/features/workout/hooks/use-routine-mutations'
import { useRoutines } from '@/features/workout/hooks/use-workout-queries'
import { getErrorMessage } from '@/features/workout/lib/errors'
import { formatExerciseCount } from '@/features/workout/lib/labels'
import type { RoutineSummary } from '@/features/workout/lib/types'
import { isWaitingForNetwork } from '@/lib/query-state'

// The "Rotinas" section of the Workout tab: active routines, a mode to reorder
// them, and the archived ones below.
export function RoutineList() {
  const routines = useRoutines()
  const [ordering, setOrdering] = useState(false)
  const [creating, setCreating] = useState(false)
  const titleId = useId()

  // A failed refetch keeps the data it had (status 'error'), so the list shows
  // whenever there is data, and the error only when there is nothing to show.
  const loaded = routines.data !== undefined
  const all = routines.data ?? []
  const active = all.filter((routine) => !routine.archived_at)
  const archived = all.filter((routine) => routine.archived_at)
  // Reordering needs at least two routines; with fewer the mode turns off.
  const canOrder = active.length >= 2
  const isOrdering = ordering && canOrder

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center justify-between gap-2">
        <h2 id={titleId} className="text-xl font-semibold tracking-tight">
          Rotinas
        </h2>
        {loaded && (
          <div className="flex items-center gap-1">
            {canOrder && (
              <Button variant="ghost" aria-pressed={isOrdering} onClick={() => setOrdering(!isOrdering)}>
                {isOrdering ? 'Concluído' : 'Ordenar'}
              </Button>
            )}
            {!isOrdering && (
              <Button variant="outline" onClick={() => setCreating(true)}>
                <Plus aria-hidden data-icon="inline-start" />
                Nova
              </Button>
            )}
          </div>
        )}
      </div>

      {isWaitingForNetwork(routines) ? <OfflineState /> : routines.isPending && <RoutineListSkeleton />}
      {!loaded && routines.isError && <ErrorState onRetry={() => void routines.refetch()} />}
      {loaded &&
        (active.length === 0 ? (
          <Card>
            <div className="px-4">
              <EmptyState
                icon={ListChecks}
                title="Ainda não tens rotinas"
                description="Cria uma rotina com os exercícios que fazes, para começares um treino num toque."
                action={<Button onClick={() => setCreating(true)}>Criar rotina</Button>}
              />
            </div>
          </Card>
        ) : (
          <ActiveRoutines routines={active} ordering={isOrdering} />
        ))}
      {loaded && <ArchivedRoutines archived={archived} routines={all} />}

      <CreateRoutineSheet open={creating} onOpenChange={setCreating} routines={active} />
    </section>
  )
}

function ActiveRoutines({ routines, ordering }: { routines: RoutineSummary[]; ordering: boolean }) {
  // One mutation for every arrow (see ReorderButtons).
  const move = useMoveRoutine()

  return (
    <div className="flex flex-col gap-2">
      <Card className="gap-0 py-0">
        <ul className="divide-y divide-border">
          {routines.map((routine, index) => (
            <li key={routine.id}>
              {ordering ? (
                <div className="flex min-h-14 items-center gap-2 py-1 pr-2 pl-4">
                  <RoutineText routine={routine} />
                  <ReorderButtons
                    name={routine.name}
                    isFirst={index === 0}
                    isLast={index === routines.length - 1}
                    disabled={move.isPending}
                    onMove={(direction) => move.mutate({ routines, id: routine.id, direction })}
                  />
                </div>
              ) : (
                // The ring is inset: the card clips anything outside it.
                <Link
                  to={`/treino/rotinas/${routine.id}`}
                  className="flex min-h-14 touch-manipulation items-center gap-3 px-4 py-2 outline-none select-none transition-[opacity,background-color] duration-150 ease-out hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset active:opacity-70 motion-reduce:transition-none"
                >
                  <RoutineText routine={routine} />
                  <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </Card>
      {move.error && (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(move.error)}
        </p>
      )}
    </div>
  )
}

function RoutineText({ routine }: { routine: RoutineSummary }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-base font-medium">{routine.name}</span>
      <span className="text-sm text-muted-foreground">{formatExerciseCount(routine.exercise_count)}</span>
    </div>
  )
}

function RoutineListSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">A carregar…</span>
      <Card aria-hidden className="gap-0 py-0">
        <div className="divide-y divide-border">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex min-h-14 flex-col justify-center gap-2 px-4 py-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3.5 w-20" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
