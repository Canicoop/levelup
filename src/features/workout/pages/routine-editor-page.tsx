import { useQueryClient } from '@tanstack/react-query'
import { cn } from 'cn'
import { Link, useParams } from 'react-router'
import { ErrorState } from '@/components/error-state'
import { PageHeader } from '@/components/layout/page-header'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { workoutKeys } from '@/features/workout/api/query-keys'
import { useRoutine } from '@/features/workout/hooks/use-workout-queries'
import { RoutineNotFoundError } from '@/features/workout/lib/errors'
import { formatTargets } from '@/features/workout/lib/targets'
import type { RoutineSummary } from '@/features/workout/lib/types'

const BACK = { to: '/treino', label: 'Voltar ao Treino' }

// One routine and its exercises. Editing comes in the next step.
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
      {routine.isPending && <ExercisesSkeleton />}
      {!routine.data && routine.isError && <ErrorState onRetry={() => void routine.refetch()} />}
      {routine.data &&
        (routine.data.exercises.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não tem exercícios.</p>
        ) : (
          <Card className="gap-0 py-0">
            <ul className="divide-y divide-border">
              {routine.data.exercises.map((entry) => (
                <li key={entry.id} className="flex min-h-14 flex-col justify-center px-4 py-2">
                  <span className="text-base font-medium wrap-break-word">{entry.exercise.name}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">{formatTargets(entry)}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
    </div>
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
