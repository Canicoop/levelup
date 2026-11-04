import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { setActiveWorkout } from '@/features/workout/active-workout-store'
import { workoutKeys } from '@/features/workout/api/query-keys'
import { fetchRoutine } from '@/features/workout/api/routines'
import { fetchLastSets } from '@/features/workout/api/workouts'
import { startWorkout, type LastSetsByExercise } from '@/features/workout/lib/active-workout'
import { ValidationError, isNetworkError } from '@/features/workout/lib/errors'
import type { RoutineWithExercises } from '@/features/workout/lib/types'
import { withTimeout } from '@/features/workout/lib/with-timeout'

// A weak gym connection can hang instead of failing.
const REQUEST_LIMIT_MS = 8000

// "Última vez" is a help, not a requirement: without network the workout starts
// without it. Any other failure is a real error.
async function readLastSets(
  exerciseIds: string[],
): Promise<{ lastSets: LastSetsByExercise; lastSetsUnavailable: boolean }> {
  try {
    return { lastSets: await withTimeout(fetchLastSets(exerciseIds), REQUEST_LIMIT_MS), lastSetsUnavailable: false }
  } catch (error) {
    if (isNetworkError(error)) return { lastSets: {}, lastSetsUnavailable: true }
    throw error
  }
}

// Prepares a workout from a routine and opens it. The routine comes from the
// cache when it is there, whatever its age, so a routine already seen can be
// started offline. It is read directly rather than with fetchQuery, which would
// pause without network instead of failing.
export function useStartWorkout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (routineId: string) => {
      const routine =
        queryClient.getQueryData<RoutineWithExercises>(workoutKeys.routine(routineId)) ??
        (await withTimeout(fetchRoutine(routineId), REQUEST_LIMIT_MS))
      if (routine.exercises.length === 0) throw new ValidationError('Esta rotina não tem exercícios.')

      const last = await readLastSets(routine.exercises.map((entry) => entry.exercise_id))
      return startWorkout({ id: crypto.randomUUID(), startedAt: new Date().toISOString(), routine, ...last })
    },
    onSuccess: (workout) => {
      setActiveWorkout(workout)
      void navigate('/treino/em-curso')
    },
  })
}
