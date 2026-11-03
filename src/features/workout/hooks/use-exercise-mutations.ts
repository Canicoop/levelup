import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  archiveExercise,
  createExercise,
  renameExercise,
  setExerciseArchived,
} from '@/features/workout/api/exercises'
import { workoutKeys } from '@/features/workout/api/query-keys'
import type { Exercise } from '@/features/workout/lib/types'

// Exercise names also appear inside routines, so every exercise change
// refetches the whole workout module once it settles, success or failure.
// On success the mutation stays pending until the refetch ends; on failure the
// error shows at once and the refetch runs in the background
// (see use-routine-mutations.ts).
function useRefetchWorkout() {
  const queryClient = useQueryClient()
  return (_data: unknown, error: Error | null) => {
    const refetch = queryClient.invalidateQueries({ queryKey: workoutKeys.all })
    return error ? undefined : refetch
  }
}

// `exercises` is the full list (archived included), used to decide between
// creating, reactivating and refusing a duplicate.
export function useCreateExercise() {
  const refetch = useRefetchWorkout()
  return useMutation({
    mutationFn: ({ name, exercises }: { name: string; exercises: Exercise[] }) => createExercise(name, exercises),
    onSettled: refetch,
  })
}

// `exercises` is the full list, to refuse a name another exercise has.
export function useRenameExercise() {
  const refetch = useRefetchWorkout()
  return useMutation({
    mutationFn: ({ id, name, exercises }: { id: string; name: string; exercises: Exercise[] }) =>
      renameExercise(id, name, exercises),
    onSettled: refetch,
  })
}

// Takes the exercise out of every routine, then archives it (see archiveExercise).
export function useArchiveExercise() {
  const refetch = useRefetchWorkout()
  return useMutation({
    mutationFn: (id: string) => archiveExercise(id),
    onSettled: refetch,
  })
}

// Used to reactivate; archiving goes through useArchiveExercise.
export function useSetExerciseArchived() {
  const refetch = useRefetchWorkout()
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => setExerciseArchived(id, archived),
    onSettled: refetch,
  })
}
