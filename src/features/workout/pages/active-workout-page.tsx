import { useState } from 'react'
import { Ellipsis, Plus } from 'lucide-react'
import { Navigate, ScrollRestoration } from 'react-router'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { setActiveWorkout, updateActiveWorkout } from '@/features/workout/active-workout-store'
import { WORKOUT_LIMIT_MESSAGE, WorkoutExercise } from '@/features/workout/components/workout-exercise'
import { WorkoutExerciseSheet } from '@/features/workout/components/workout-exercise-sheet'
import { WorkoutMenuSheet } from '@/features/workout/components/workout-menu-sheet'
import { useActiveWorkout } from '@/features/workout/hooks/use-active-workout'
import { useExerciseAnchor } from '@/features/workout/hooks/use-exercise-anchor'
import type { WorkoutPickMode } from '@/features/workout/hooks/use-workout-exercise-pick'
import {
  MAX_WORKOUT_EXERCISES,
  addSet,
  canSwapExercise,
  countLoggedSets,
  openExercise,
  skipExercise,
  toggleSet,
  undoSkip,
  type ActiveWorkout,
} from '@/features/workout/lib/active-workout'

// The workout in progress, full screen: a sibling of AppShell, so it brings its
// own safe-area padding and scroll restoration. Back leaves the workout running.
export function ActiveWorkoutPage() {
  const workout = useActiveWorkout()
  const anchor = useExerciseAnchor(workout?.openExerciseId ?? null)
  const [menuOpen, setMenuOpen] = useState(false)
  // The mode stays set while the sheet closes; `pickerOpen` alone controls it.
  const [pickMode, setPickMode] = useState<WorkoutPickMode>({ kind: 'add' })
  const [pickerOpen, setPickerOpen] = useState(false)

  // Also after discarding here: the store changes and this goes back.
  if (!workout) return <Navigate to="/treino" replace />

  const workoutFull = workout.exercises.length >= MAX_WORKOUT_EXERCISES

  // Tapping opens the exercise, closing the one that was open; tapping the open
  // one closes it. It stays under the finger.
  function tapExercise(current: ActiveWorkout, exerciseId: string) {
    anchor.hold(exerciseId, { slide: false })
    updateActiveWorkout((latest) => openExercise(latest, current.openExerciseId === exerciseId ? null : exerciseId))
  }

  // When another exercise opens by itself it slides into view; with nothing
  // left to open, nothing moves.
  function apply(current: ActiveWorkout, next: ActiveWorkout) {
    const opened = next.openExerciseId
    if (opened && opened !== current.openExerciseId) anchor.hold(opened, { slide: true })
    setActiveWorkout(next)
  }

  // Returns the error when ✓ is refused.
  function toggle(current: ActiveWorkout, exerciseId: string, index: number) {
    const result = toggleSet(current, exerciseId, index, new Date().toISOString())
    if (!result.ok) return result.error
    apply(current, result.workout)
    return null
  }

  function openPicker(mode: WorkoutPickMode) {
    setPickMode(mode)
    setPickerOpen(true)
  }

  // A swap without logged sets takes the same place and the screen stays still;
  // otherwise the exercise that opens slides into view.
  function onPicked(current: ActiveWorkout, exerciseId: string) {
    const swapped = pickMode.kind === 'swap' ? current.exercises.find((e) => e.exerciseId === pickMode.exerciseId) : null
    const inPlace = swapped !== null && swapped !== undefined && !swapped.sets.some((set) => set.done)
    anchor.hold(exerciseId, { slide: !inPlace })
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
              canSwap={canSwapExercise(workout, exercise.exerciseId)}
              rowRef={(row) => anchor.setRow(exercise.exerciseId, row)}
              onHeaderTap={() => tapExercise(workout, exercise.exerciseId)}
              onToggleSet={(index) => toggle(workout, exercise.exerciseId, index)}
              onAddSet={() => updateActiveWorkout((latest) => addSet(latest, exercise.exerciseId))}
              onSwap={() => openPicker({ kind: 'swap', exerciseId: exercise.exerciseId })}
              onSkip={() => apply(workout, skipExercise(workout, exercise.exerciseId))}
              onResume={() => {
                anchor.hold(exercise.exerciseId, { slide: false })
                updateActiveWorkout((latest) => undoSkip(latest, exercise.exerciseId))
              }}
            />
          ))}
        </ul>
      </Card>

      <div className="flex flex-col gap-1">
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          disabled={workoutFull}
          onClick={() => openPicker({ kind: 'add' })}
        >
          <Plus aria-hidden data-icon="inline-start" />
          Adicionar exercício
        </Button>
        {workoutFull && <p className="text-sm text-muted-foreground">{WORKOUT_LIMIT_MESSAGE}</p>}
      </div>

      <WorkoutExerciseSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mode={pickMode}
        workout={workout}
        onPicked={(exerciseId) => onPicked(workout, exerciseId)}
      />
      <WorkoutMenuSheet open={menuOpen} onOpenChange={setMenuOpen} loggedSets={countLoggedSets(workout)} />
      <ScrollRestoration />
    </div>
  )
}
