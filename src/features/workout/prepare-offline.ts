import type { QueryClient } from '@tanstack/react-query'
import { fetchExercises } from '@/features/workout/api/exercises'
import { workoutKeys } from '@/features/workout/api/query-keys'
import { fetchActiveRoutinesWithExercises, fetchRoutines } from '@/features/workout/api/routines'
import { fetchLastRoutineId, fetchLastSets, saveLastSetsCopy } from '@/features/workout/api/workouts'

// Prepares, in the background, what a workout started without network needs:
// the routine list, every active routine with its exercises (one request), the
// exercise list, the routine of the last workout and "Última vez" of all those
// exercises (one request to last_exercise_sets). They all live under
// workoutKeys.all, so they are kept on the device (see QueryProvider), and
// starting, "Trocar" and "+ Adicionar exercício" find them there.
// Failures are ignored: this only adds to what is already there.
export async function prepareWorkoutOffline(queryClient: QueryClient) {
  void queryClient.prefetchQuery({ queryKey: workoutKeys.routines(), queryFn: fetchRoutines })
  void queryClient.prefetchQuery({ queryKey: workoutKeys.exercises(), queryFn: fetchExercises })
  void queryClient.prefetchQuery({ queryKey: workoutKeys.lastRoutineId(), queryFn: fetchLastRoutineId })

  try {
    const routines = await fetchActiveRoutinesWithExercises()
    for (const routine of routines) queryClient.setQueryData(workoutKeys.routine(routine.id), routine)

    const exerciseIds = [...new Set(routines.flatMap((routine) => routine.exercises.map((e) => e.exercise_id)))]
    if (exerciseIds.length > 0) saveLastSetsCopy(queryClient, exerciseIds, await fetchLastSets(exerciseIds))
  } catch {
    // Offline or failing: what was kept from the last time stays.
  }
}
