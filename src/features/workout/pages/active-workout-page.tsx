import { useState } from 'react'
import { Ellipsis } from 'lucide-react'
import { Navigate, ScrollRestoration } from 'react-router'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { WorkoutMenuSheet } from '@/features/workout/components/workout-menu-sheet'
import { useActiveWorkout } from '@/features/workout/hooks/use-active-workout'
import { countLoggedSets, type ActiveExercise } from '@/features/workout/lib/active-workout'
import { formatLastSets } from '@/features/workout/lib/labels'
import { formatTargets } from '@/features/workout/lib/targets'

// The workout in progress, full screen: a sibling of AppShell, so it brings its
// own safe-area padding and scroll restoration. Back leaves the workout running.
export function ActiveWorkoutPage() {
  const workout = useActiveWorkout()
  const [menuOpen, setMenuOpen] = useState(false)

  // Also after discarding here: the store changes and this goes back.
  if (!workout) return <Navigate to="/treino" replace />

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]">
      <PageHeader
        title={workout.routineName}
        documentTitle="Treino em curso"
        back={{ to: '/treino', label: 'Voltar ao Treino' }}
      >
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Mais opções"
          className="shrink-0"
          onClick={() => setMenuOpen(true)}
        >
          <Ellipsis aria-hidden className="size-5" strokeWidth={1.75} />
        </Button>
      </PageHeader>

      {workout.lastSetsUnavailable && (
        <p className="text-sm text-muted-foreground">Sem ligação: a última vez não está disponível.</p>
      )}

      <Card className="gap-0 py-0">
        <ul className="divide-y divide-border">
          {workout.exercises.map((exercise) => (
            <li key={exercise.exerciseId} className="flex flex-col gap-0.5 px-4 py-3">
              <span className="text-base font-medium wrap-break-word">{exercise.name}</span>
              <span className="text-sm text-muted-foreground tabular-nums">{goal(exercise)}</span>
              {!workout.lastSetsUnavailable && (
                <span className="text-sm text-muted-foreground tabular-nums">{formatLastSets(exercise.lastSets)}</span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <WorkoutMenuSheet open={menuOpen} onOpenChange={setMenuOpen} loggedSets={countLoggedSets(workout)} />
      <ScrollRestoration />
    </div>
  )
}

function goal({ targetSets, repMin, repMax }: ActiveExercise) {
  return formatTargets({ target_sets: targetSets, rep_min: repMin, rep_max: repMax })
}
