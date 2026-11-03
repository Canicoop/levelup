// Query keys for the workout module. A routine's key starts with the routines
// key, so invalidating routines() also refreshes every open routine. Every key
// starts with all, which exercise changes invalidate.
export const workoutKeys = {
  all: ['workout'] as const,
  routines: () => [...workoutKeys.all, 'routines'] as const,
  routine: (id: string) => [...workoutKeys.all, 'routines', id] as const,
  exercises: () => [...workoutKeys.all, 'exercises'] as const,
  // The routines that contain an exercise, for the archive confirmation.
  exerciseRoutines: (exerciseId: string) => [...workoutKeys.all, 'exercises', exerciseId, 'routines'] as const,
}
