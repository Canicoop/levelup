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
// database. Returning the promise keeps the mutation pending until the refetch ends.

// Routines: the routines key also covers each open routine.
function useInvalidateRoutines() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: workoutKeys.routines() })
}

export function useCreateRoutine() {
  const invalidate = useInvalidateRoutines()
  return useMutation({
    mutationFn: ({ name, routines }: { name: string; routines: Routine[] }) =>
      createRoutine(name, nextPosition(routines)),
    onSettled: invalidate,
  })
}

export function useRenameRoutine() {
  const invalidate = useInvalidateRoutines()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameRoutine(id, name),
    onSettled: invalidate,
  })
}

// Reactivating puts the routine at the end of the active list.
export function useSetRoutineArchived() {
  const invalidate = useInvalidateRoutines()
  return useMutation({
    mutationFn: ({ id, archived, routines }: { id: string; archived: boolean; routines: Routine[] }) =>
      setRoutineArchived(
        id,
        archived,
        archived ? undefined : nextPosition(routines.filter((routine) => !routine.archived_at)),
      ),
    onSettled: invalidate,
  })
}

// `routines` is the active list, in the order it is shown.
export function useMoveRoutine() {
  const invalidate = useInvalidateRoutines()
  return useMutation({
    mutationFn: ({ routines, id, direction }: { routines: Routine[]; id: string; direction: Direction }) =>
      updateRoutinePositions(moveItem(routines, id, direction)),
    onSettled: invalidate,
  })
}

// A routine's exercises: only that routine changes.
function useInvalidateRoutine(routineId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: workoutKeys.routine(routineId) })
}

// Added at the end, with 3 sets and no rep range.
export function useAddRoutineExercise(routineId: string) {
  const invalidate = useInvalidateRoutine(routineId)
  return useMutation({
    mutationFn: ({ exerciseId, entries }: { exerciseId: string; entries: RoutineExercise[] }) =>
      addRoutineExercise({
        routine_id: routineId,
        exercise_id: exerciseId,
        position: nextPosition(entries),
        ...DEFAULT_TARGETS,
      }),
    onSettled: invalidate,
  })
}

export function useRemoveRoutineExercise(routineId: string) {
  const invalidate = useInvalidateRoutine(routineId)
  return useMutation({
    mutationFn: (id: string) => removeRoutineExercise(id),
    onSettled: invalidate,
  })
}

export function useUpdateRoutineExercise(routineId: string) {
  const invalidate = useInvalidateRoutine(routineId)
  return useMutation({
    mutationFn: ({ id, targets }: { id: string; targets: Targets }) => updateRoutineExercise(id, targets),
    onSettled: invalidate,
  })
}

// `entries` is the routine's exercise list, in the order it is shown.
export function useMoveRoutineExercise(routineId: string) {
  const invalidate = useInvalidateRoutine(routineId)
  return useMutation({
    mutationFn: ({ entries, id, direction }: { entries: RoutineExercise[]; id: string; direction: Direction }) =>
      updateRoutineExercisePositions(moveItem(entries, id, direction)),
    onSettled: invalidate,
  })
}
