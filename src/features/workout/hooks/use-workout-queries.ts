import { useQuery } from '@tanstack/react-query'
import { fetchExercises } from '@/features/workout/api/exercises'
import { workoutKeys } from '@/features/workout/api/query-keys'
import { fetchRoutine, fetchRoutines } from '@/features/workout/api/routines'
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

export function useExercises() {
  return useQuery({ queryKey: workoutKeys.exercises(), queryFn: fetchExercises })
}
