// Query keys for the workout module. A routine's key starts with the routines
// key, so invalidating routines() also refreshes every open routine. Every key
// starts with all, which exercise changes invalidate.
export const workoutKeys = {
  all: ['workout'] as const,
  routines: () => [...workoutKeys.all, 'routines'] as const,
  routine: (id: string) => [...workoutKeys.all, 'routines', id] as const,
  exercises: () => [...workoutKeys.all, 'exercises'] as const,
  // The routine of the last finished workout, for the next routine.
  lastRoutineId: () => [...workoutKeys.all, 'last-routine-id'] as const,
  // "Última vez" of the active routines' exercises, kept for when there is no
  // network (see lastSetsFromCopy). Not a query of its own: written by the
  // background preparation and by every successful read of last sets.
  lastSetsCopy: () => [...workoutKeys.all, 'last-sets-copy'] as const,
  // Finished workouts. `recent` covers the heatmap's 12 weeks; `history` is the
  // list, 20 at a time (only its first page is kept on the device, see
  // trimForCopy); `detail` is one workout not found in either.
  workouts: () => [...workoutKeys.all, 'workouts'] as const,
  recentWorkouts: () => [...workoutKeys.workouts(), 'recent'] as const,
  history: () => [...workoutKeys.workouts(), 'history'] as const,
  workoutDetail: (id: string) => [...workoutKeys.workouts(), 'detail', id] as const,
  // The routines that contain an exercise, for the archive confirmation.
  exerciseRoutines: (exerciseId: string) => [...workoutKeys.all, 'exercises', exerciseId, 'routines'] as const,
}
