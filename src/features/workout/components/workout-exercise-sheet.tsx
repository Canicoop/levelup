import { useRef, type RefObject } from 'react'
import { BottomSheet } from '@/components/bottom-sheet'
import { useSheetBusy } from '@/components/sheet-busy'
import { ExercisePicker } from '@/features/workout/components/exercise-picker'
import { useWorkoutExercisePick, type WorkoutPickMode } from '@/features/workout/hooks/use-workout-exercise-pick'
import type { ActiveWorkout } from '@/features/workout/lib/active-workout'

type WorkoutExerciseSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Kept by the caller while the sheet closes, so the title does not change.
  mode: WorkoutPickMode
  workout: ActiveWorkout
  // Called just before the workout changes, with the exercise that will open.
  onPicked: (exerciseId: string) => void
}

// The exercise search, for "Trocar" and "+ Adicionar exercício". It closes once
// an exercise is chosen.
export function WorkoutExerciseSheet({ open, onOpenChange, mode, workout, onPicked }: WorkoutExerciseSheetProps) {
  const searchRef = useRef<HTMLInputElement>(null)
  const title = mode.kind === 'swap' ? 'Trocar exercício' : 'Adicionar exercício'

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title} initialFocus={searchRef}>
      <WorkoutExercisePicker
        searchRef={searchRef}
        mode={mode}
        workout={workout}
        onPicked={(exerciseId) => {
          onOpenChange(false)
          onPicked(exerciseId)
        }}
      />
    </BottomSheet>
  )
}

function WorkoutExercisePicker({
  searchRef,
  mode,
  workout,
  onPicked,
}: {
  searchRef: RefObject<HTMLInputElement | null>
  mode: WorkoutPickMode
  workout: ActiveWorkout
  onPicked: (exerciseId: string) => void
}) {
  const pick = useWorkoutExercisePick(mode, onPicked)
  useSheetBusy(pick.isPending)

  return (
    <ExercisePicker
      searchRef={searchRef}
      takenIds={new Set(workout.exercises.map((exercise) => exercise.exerciseId))}
      takenLabel="No treino"
      // The screen only opens this when there is room (see canAddExercise and
      // canSwapExercise).
      limitMessage={null}
      pending={pick.isPending ? pick.variables.choice : null}
      pendingLabel={mode.kind === 'swap' ? 'A trocar…' : 'A adicionar…'}
      error={pick.error}
      onEdit={pick.reset}
      onPick={(choice, exercises) => pick.mutate({ choice, exercises })}
    />
  )
}
