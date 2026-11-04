import { useState } from 'react'
import { Ellipsis } from 'lucide-react'
import { Navigate, ScrollRestoration } from 'react-router'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { setActiveWorkout, updateActiveWorkout } from '@/features/workout/active-workout-store'
import { WorkoutExercise } from '@/features/workout/components/workout-exercise'
import { WorkoutMenuSheet } from '@/features/workout/components/workout-menu-sheet'
import { useActiveWorkout } from '@/features/workout/hooks/use-active-workout'
import { useExerciseAnchor } from '@/features/workout/hooks/use-exercise-anchor'
import {
  addSet,
  countLoggedSets,
  openExercise,
  toggleSet,
  type ActiveWorkout,
} from '@/features/workout/lib/active-workout'

// The workout in progress, full screen: a sibling of AppShell, so it brings its
// own safe-area padding and scroll restoration. Back leaves the workout running.
export function ActiveWorkoutPage() {
  const workout = useActiveWorkout()
  const anchor = useExerciseAnchor(workout?.openExerciseId ?? null)
  const [menuOpen, setMenuOpen] = useState(false)

  // Also after discarding here: the store changes and this goes back.
  if (!workout) return <Navigate to="/treino" replace />

  // Tapping opens the exercise, closing the one that was open; tapping the open
  // one closes it. It stays under the finger.
  function tapExercise(current: ActiveWorkout, exerciseId: string) {
    anchor.hold(exerciseId, { slide: false })
    updateActiveWorkout((latest) => openExercise(latest, current.openExerciseId === exerciseId ? null : exerciseId))
  }

  // Returns the error when ✓ is refused. When the next exercise opens by itself
  // it slides into view; after the last one nothing is open, and nothing moves.
  function toggle(current: ActiveWorkout, exerciseId: string, index: number) {
    const result = toggleSet(current, exerciseId, index)
    if (!result.ok) return result.error

    const next = result.workout.openExerciseId
    if (next && next !== current.openExerciseId) anchor.hold(next, { slide: true })
    setActiveWorkout(result.workout)
    return null
  }

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
            <WorkoutExercise
              key={exercise.exerciseId}
              exercise={exercise}
              open={workout.openExerciseId === exercise.exerciseId}
              showLastSets={!workout.lastSetsUnavailable}
              rowRef={(row) => anchor.setRow(exercise.exerciseId, row)}
              onHeaderTap={() => tapExercise(workout, exercise.exerciseId)}
              onToggleSet={(index) => toggle(workout, exercise.exerciseId, index)}
              onAddSet={() => updateActiveWorkout((latest) => addSet(latest, exercise.exerciseId))}
            />
          ))}
        </ul>
      </Card>

      <WorkoutMenuSheet open={menuOpen} onOpenChange={setMenuOpen} loggedSets={countLoggedSets(workout)} />
      <ScrollRestoration />
    </div>
  )
}
