import { useMutation, useQueryClient } from '@tanstack/react-query'
import { workoutKeys } from '@/features/workout/api/query-keys'
import {
  addRoutineExercise,
  removeRoutineExercise,
  updateRoutineExercise,
  updateRoutineExercisePositions,
} from '@/features/workout/api/routine-exercises'
import {
  createRoutine,
  renameRoutine,
  setRoutineArchived,
  updateRoutinePositions,
} from '@/features/workout/api/routines'
import { moveItem, nextPosition } from '@/features/workout/lib/positions'
import { DEFAULT_TARGETS } from '@/features/workout/lib/targets'
import type { Routine, RoutineExercise, Targets } from '@/features/workout/lib/types'

type Direction = 'up' | 'down'

// Every mutation refetches what it touched once it settles, whether it
// succeeded or failed (no optimistic updates yet): if a move fails halfway,
// with only one of two changes saved, the screen shows what really is in the
// database.
// On success, returning the refetch keeps the mutation pending until the new
// data arrives, so the screen never shows the old state as saved. On failure
// the refetch runs in the background and the error shows at once: offline,
// the refetch would retry for several seconds before giving up.

// Routines: the routines key also covers each open routine.
function useRefetchRoutines() {
  const queryClient = useQueryClient()
  return (_data: unknown, error: Error | null) => {
    const refetch = queryClient.invalidateQueries({ queryKey: workoutKeys.routines() })
    return error ? undefined : refetch
  }
}

export function useCreateRoutine() {
  const refetch = useRefetchRoutines()
  return useMutation({
    mutationFn: ({ name, routines }: { name: string; routines: Routine[] }) =>
      createRoutine(name, nextPosition(routines)),
    onSettled: refetch,
  })
}

export function useRenameRoutine() {
  const refetch = useRefetchRoutines()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameRoutine(id, name),
    onSettled: refetch,
  })
}

// Reactivating puts the routine at the end of the active list.
export function useSetRoutineArchived() {
  const refetch = useRefetchRoutines()
  return useMutation({
    mutationFn: ({ id, archived, routines }: { id: string; archived: boolean; routines: Routine[] }) =>
      setRoutineArchived(
        id,
        archived,
        archived ? undefined : nextPosition(routines.filter((routine) => !routine.archived_at)),
      ),
    onSettled: refetch,
  })
}

// `routines` is the active list, in the order it is shown.
export function useMoveRoutine() {
  const refetch = useRefetchRoutines()
  return useMutation({
    mutationFn: ({ routines, id, direction }: { routines: Routine[]; id: string; direction: Direction }) =>
      updateRoutinePositions(moveItem(routines, id, direction)),
    onSettled: refetch,
  })
}

// A routine's exercises: only that routine changes.
function useRefetchRoutine(routineId: string) {
  const queryClient = useQueryClient()
  return (_data: unknown, error: Error | null) => {
    const refetch = queryClient.invalidateQueries({ queryKey: workoutKeys.routine(routineId) })
    return error ? undefined : refetch
  }
}

// Added at the end, with 3 sets and no rep range.
export function useAddRoutineExercise(routineId: string) {
  const refetch = useRefetchRoutine(routineId)
  return useMutation({
    mutationFn: ({ exerciseId, entries }: { exerciseId: string; entries: RoutineExercise[] }) =>
      addRoutineExercise({
        routine_id: routineId,
        exercise_id: exerciseId,
        position: nextPosition(entries),
        ...DEFAULT_TARGETS,
      }),
    onSettled: refetch,
  })
}

export function useRemoveRoutineExercise(routineId: string) {
  const refetch = useRefetchRoutine(routineId)
  return useMutation({
    mutationFn: (id: string) => removeRoutineExercise(id),
    onSettled: refetch,
  })
}

export function useUpdateRoutineExercise(routineId: string) {
  const refetch = useRefetchRoutine(routineId)
  return useMutation({
    mutationFn: ({ id, targets }: { id: string; targets: Targets }) => updateRoutineExercise(id, targets),
    onSettled: refetch,
  })
}

// `entries` is the routine's exercise list, in the order it is shown.
export function useMoveRoutineExercise(routineId: string) {
  const refetch = useRefetchRoutine(routineId)
  return useMutation({
    mutationFn: ({ entries, id, direction }: { entries: RoutineExercise[]; id: string; direction: Direction }) =>
      updateRoutineExercisePositions(moveItem(entries, id, direction)),
    onSettled: refetch,
  })
}
