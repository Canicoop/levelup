import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { setActiveWorkout } from '@/features/workout/active-workout-store'
import { workoutKeys } from '@/features/workout/api/query-keys'
import { fetchRoutine } from '@/features/workout/api/routines'
import { REQUEST_LIMIT_MS, fetchLastSetsIfOnline } from '@/features/workout/api/workouts'
import { startWorkout } from '@/features/workout/lib/active-workout'
import { ValidationError } from '@/features/workout/lib/errors'
import type { RoutineWithExercises } from '@/features/workout/lib/types'
import { withTimeout } from '@/features/workout/lib/with-timeout'

// Prepares a workout from a routine and opens it. The routine comes from the
// cache when it is there, whatever its age: every active routine is prepared
// in the background and kept on the device (see prepareWorkoutOffline), so any
// of them can be started offline. It is read directly rather than with fetchQuery, which would
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

      const last = await fetchLastSetsIfOnline(
        queryClient,
        routine.exercises.map((entry) => entry.exercise_id),
      )
      return startWorkout({ id: crypto.randomUUID(), startedAt: new Date().toISOString(), routine, ...last })
    },
    onSuccess: (workout) => {
      setActiveWorkout(workout)
      void navigate('/treino/em-curso')
    },
  })
}
