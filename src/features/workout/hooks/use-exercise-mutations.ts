import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createExercise, renameExercise, setExerciseArchived } from '@/features/workout/api/exercises'
import { workoutKeys } from '@/features/workout/api/query-keys'
import type { Exercise } from '@/features/workout/lib/types'

// Exercise names also appear inside routines, so every exercise change
// refetches the whole workout module once it settles, success or failure
// (see use-routine-mutations.ts).
function useInvalidateWorkout() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: workoutKeys.all })
}

// `exercises` is the full list (archived included), used to decide between
// creating, reactivating and refusing a duplicate.
export function useCreateExercise() {
  const invalidate = useInvalidateWorkout()
  return useMutation({
    mutationFn: ({ name, exercises }: { name: string; exercises: Exercise[] }) => createExercise(name, exercises),
    onSettled: invalidate,
  })
}

export function useRenameExercise() {
  const invalidate = useInvalidateWorkout()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameExercise(id, name),
    onSettled: invalidate,
  })
}

export function useSetExerciseArchived() {
  const invalidate = useInvalidateWorkout()
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => setExerciseArchived(id, archived),
    onSettled: invalidate,
  })
}
