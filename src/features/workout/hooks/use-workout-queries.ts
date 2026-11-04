import { useQuery } from '@tanstack/react-query'
import { fetchExercises } from '@/features/workout/api/exercises'
import { workoutKeys } from '@/features/workout/api/query-keys'
import { fetchExerciseRoutines } from '@/features/workout/api/routine-exercises'
import { fetchRoutine, fetchRoutines } from '@/features/workout/api/routines'
import { fetchLastRoutineId } from '@/features/workout/api/workouts'
import { RoutineNotFoundError } from '@/features/workout/lib/errors'

export function useRoutines() {
  return useQuery({ queryKey: workoutKeys.routines(), queryFn: fetchRoutines })
}

export function useRoutine(id: string) {
  return useQuery({
    queryKey: workoutKeys.routine(id),
    queryFn: () => fetchRoutine(id),
    // A routine that does not exist will not appear by retrying.
    retry: (failureCount, error) => !(error instanceof RoutineNotFoundError) && failureCount < 3,
  })
}

export function useLastRoutineId() {
  return useQuery({ queryKey: workoutKeys.lastRoutineId(), queryFn: fetchLastRoutineId })
}

export function useExercises() {
  return useQuery({ queryKey: workoutKeys.exercises(), queryFn: fetchExercises })
}

// Read fresh each time the archive confirmation opens, so the names it lists
// are current.
export function useExerciseRoutines(exerciseId: string) {
  return useQuery({
    queryKey: workoutKeys.exerciseRoutines(exerciseId),
    queryFn: () => fetchExerciseRoutines(exerciseId),
    staleTime: 0,
  })
}
