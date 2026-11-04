import { useState } from 'react'
import { ChevronRight, Dumbbell, Plus } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { PageHeader } from '@/components/layout/page-header'
import { OfflineState } from '@/components/offline-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArchivedExercises } from '@/features/workout/components/archived-exercises'
import { CreateExerciseSheet } from '@/features/workout/components/create-exercise-sheet'
import { ExerciseSheet } from '@/features/workout/components/exercise-sheet'
import { useExercises } from '@/features/workout/hooks/use-workout-queries'
import type { Exercise } from '@/features/workout/lib/types'
import { isWaitingForNetwork } from '@/lib/query-state'

const BACK = { to: '/treino', label: 'Voltar ao Treino' }

// Every exercise, in alphabetical order (fetchExercises sorts them): create,
// rename, archive and reactivate.
export function ExercisesPage() {
  const exercises = useExercises()
  const [creating, setCreating] = useState(false)
  // Kept while the sheet closes; `open` alone controls it (see RoutineExerciseList).
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [open, setOpen] = useState(false)

  // A failed refetch keeps the data it had, so the error shows only without data.
  const all = exercises.data ?? []
  const active = all.filter((exercise) => !exercise.archived_at)
  const archived = all.filter((exercise) => exercise.archived_at)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Exercícios" back={BACK}>
        {exercises.data && (
          <Button variant="outline" onClick={() => setCreating(true)}>
            <Plus aria-hidden data-icon="inline-start" />
            Novo
          </Button>
        )}
      </PageHeader>

      {isWaitingForNetwork(exercises) ? <OfflineState /> : exercises.isPending && <ExercisesSkeleton />}
      {!exercises.data && exercises.isError && <ErrorState onRetry={() => void exercises.refetch()} />}
      {exercises.data &&
        (active.length === 0 ? (
          <Card>
            <div className="px-4">
              <EmptyState
                icon={Dumbbell}
                title="Ainda não tens exercícios"
                description="Cria-os aqui ou ao adicionar exercícios a uma rotina."
                action={<Button onClick={() => setCreating(true)}>Criar exercício</Button>}
              />
            </div>
          </Card>
        ) : (
          <Card className="gap-0 py-0">
            <ul className="divide-y divide-border">
              {active.map((exercise) => (
                <li key={exercise.id}>
                  {/* The ring is inset: the card clips anything outside it. */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(exercise)
                      setOpen(true)
                    }}
                    className="flex min-h-12 w-full touch-manipulation items-center gap-3 px-4 py-2 text-left outline-none select-none transition-[opacity,background-color] duration-150 ease-out hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset active:opacity-70 motion-reduce:transition-none"
                  >
                    <span className="min-w-0 flex-1 text-base font-medium wrap-break-word">{exercise.name}</span>
                    <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      {exercises.data && <ArchivedExercises archived={archived} />}

      <CreateExerciseSheet open={creating} onOpenChange={setCreating} exercises={all} />
      <ExerciseSheet open={open} onOpenChange={setOpen} exercise={selected} />
    </div>
  )
}

function ExercisesSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">A carregar…</span>
      <Card aria-hidden className="gap-0 py-0">
        <div className="divide-y divide-border">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="flex min-h-12 items-center px-4 py-2">
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
