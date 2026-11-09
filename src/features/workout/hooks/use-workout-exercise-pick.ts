import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateActiveWorkout } from '@/features/workout/active-workout-store'
import { createExercise } from '@/features/workout/api/exercises'
import { workoutKeys } from '@/features/workout/api/query-keys'
import { fetchLastSetsIfOnline } from '@/features/workout/api/workouts'
import { addExercise, swapExercise, type LastSet } from '@/features/workout/lib/active-workout'
import type { Exercise, ExerciseChoice } from '@/features/workout/lib/types'

// "Trocar" replaces one exercise; "+ Adicionar exercício" adds one at the end.
export type WorkoutPickMode = { kind: 'swap'; exerciseId: string } | { kind: 'add' }

type Picked = { exercise: Pick<Exercise, 'id' | 'name'>; lastSets: LastSet[]; lastSetsUnavailable: boolean }

// An exercise chosen for the workout in progress.
// - An existing one, archived included, is used as it is: nothing is written,
//   so it works without network. Archived exercises are reactivated from the
//   Exercises screen, not from a workout.
// - "Criar “…”" writes the exercise, so it needs the network; without it the
//   error shows. createExercise may reactivate an archived one with that name.
// Its "Última vez" is read when it can have history; without network it joins
// anyway, marked unavailable.
export function useWorkoutExercisePick(mode: WorkoutPickMode, onPicked: (exerciseId: string) => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ choice, exercises }: { choice: ExerciseChoice; exercises: Exercise[] }): Promise<Picked> => {
      let exercise: Pick<Exercise, 'id' | 'name'>
      let mayHaveHistory = true
      if (choice.kind === 'new') {
        const created = await createExercise(choice.name, exercises)
        exercise = created.exercise
        mayHaveHistory = created.reactivated
        void queryClient.invalidateQueries({ queryKey: workoutKeys.exercises() })
      } else {
        exercise = choice.exercise
      }
      if (!mayHaveHistory) return { exercise, lastSets: [], lastSetsUnavailable: false }

      const last = await fetchLastSetsIfOnline([exercise.id])
      return { exercise, lastSets: last.lastSets[exercise.id] ?? [], lastSetsUnavailable: last.lastSetsUnavailable }
    },
    onSuccess: ({ exercise, lastSets, lastSetsUnavailable }) => {
      onPicked(exercise.id)
      updateActiveWorkout((workout) =>
        mode.kind === 'swap'
          ? swapExercise(workout, mode.exerciseId, exercise, lastSets, lastSetsUnavailable)
          : addExercise(workout, exercise, lastSets, lastSetsUnavailable),
      )
    },
  })
}
