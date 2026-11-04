import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from 'cn'
import { Plus } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { ErrorState } from '@/components/error-state'
import { PageHeader } from '@/components/layout/page-header'
import { OfflineState } from '@/components/offline-state'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { workoutKeys } from '@/features/workout/api/query-keys'
import { AddExerciseSheet } from '@/features/workout/components/add-exercise-sheet'
import { ArchiveRoutineSheet } from '@/features/workout/components/archive-routine-sheet'
import { RenameRoutineSheet } from '@/features/workout/components/rename-routine-sheet'
import { RoutineExerciseList } from '@/features/workout/components/routine-exercise-list'
import { useSetRoutineArchived } from '@/features/workout/hooks/use-routine-mutations'
import { useRoutine, useRoutines } from '@/features/workout/hooks/use-workout-queries'
import { RoutineNotFoundError, getErrorMessage } from '@/features/workout/lib/errors'
import type { Routine, RoutineSummary, RoutineWithExercises } from '@/features/workout/lib/types'
import { isWaitingForNetwork } from '@/lib/query-state'

const BACK = { to: '/treino', label: 'Voltar ao Treino' }

// One routine: its exercises (sets, reps, order), its name, and archiving.
// Exercises are added through "Adicionar exercício".
export function RoutineEditorPage() {
  const { id = '' } = useParams()
  const routine = useRoutine(id)
  // Coming from the list, the name is already known: the title shows it while
  // the exercises load.
  const queryClient = useQueryClient()
  const listedName = queryClient
    .getQueryData<RoutineSummary[]>(workoutKeys.routines())
    ?.find((item) => item.id === id)?.name

  if (routine.error instanceof RoutineNotFoundError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Rotina não encontrada" back={BACK} />
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-pretty text-muted-foreground">
            O endereço pode estar errado, ou a rotina já não existe.
          </p>
          {/* cn resolves the variant's border over the base border-transparent;
              buttonVariants alone keeps both. */}
          <Link to="/treino" className={cn(buttonVariants({ variant: 'outline' }))}>
            Voltar ao Treino
          </Link>
        </div>
      </div>
    )
  }

  const title = routine.data?.name ?? listedName ?? 'Rotina'

  // A failed refetch keeps the data it had, so the error shows only without data.
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} back={BACK} />
      {isWaitingForNetwork(routine) ? <OfflineState /> : routine.isPending && <ExercisesSkeleton />}
      {!routine.data && routine.isError && <ErrorState onRetry={() => void routine.refetch()} />}
      {routine.data && <RoutineEditor routine={routine.data} />}
    </div>
  )
}

function RoutineEditor({ routine }: { routine: RoutineWithExercises }) {
  const [adding, setAdding] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const archived = routine.archived_at !== null

  return (
    <>
      {archived && <ArchivedNotice routine={routine} />}
      <div className="flex flex-col gap-3">
        <RoutineExerciseList routineId={routine.id} entries={routine.exercises} />
        <Button variant="outline" size="lg" className="w-full" onClick={() => setAdding(true)}>
          <Plus aria-hidden data-icon="inline-start" />
          Adicionar exercício
        </Button>
        <AddExerciseSheet
          open={adding}
          onOpenChange={setAdding}
          routineId={routine.id}
          entries={routine.exercises}
        />
      </div>
      {/* An archived routine is reactivated first; renaming and archiving wait. */}
      {!archived && (
        <div className="-mx-2.5 flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setRenaming(true)}>
            Mudar nome
          </Button>
          <Button variant="ghost" onClick={() => setArchiving(true)}>
            Arquivar rotina
          </Button>
          <RenameRoutineSheet open={renaming} onOpenChange={setRenaming} routine={routine} />
          <ArchiveRoutineSheet open={archiving} onOpenChange={setArchiving} routine={routine} />
        </div>
      )}
    </>
  )
}

// Reactivating needs the routine list, to put the routine at the end of the
// active ones; the button waits until the list has loaded.
function ArchivedNotice({ routine }: { routine: Routine }) {
  const routines = useRoutines()
  const reactivate = useSetRoutineArchived()

  return (
    <Card size="sm">
      <div className="flex flex-col gap-2 px-3">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <p className="text-sm font-medium">Esta rotina está arquivada</p>
          <Button
            variant="outline"
            disabled={!routines.data || reactivate.isPending}
            onClick={() =>
              routines.data && reactivate.mutate({ id: routine.id, archived: false, routines: routines.data })
            }
          >
            {reactivate.isPending ? 'A reativar…' : 'Reativar'}
          </Button>
        </div>
        {reactivate.error && (
          <p role="alert" className="text-sm text-destructive">
            {getErrorMessage(reactivate.error)}
          </p>
        )}
      </div>
    </Card>
  )
}

function ExercisesSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">A carregar…</span>
      <Card aria-hidden className="gap-0 py-0">
        <div className="divide-y divide-border">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex min-h-14 flex-col justify-center gap-2 px-4 py-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3.5 w-16" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
