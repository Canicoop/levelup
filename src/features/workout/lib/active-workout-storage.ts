import type { ActiveExercise, ActiveSet, ActiveWorkout, LastSet } from '@/features/workout/lib/active-workout'
import { setFieldError } from '@/features/workout/lib/set-values'

// Raised when the stored format changes in a way an older value cannot be read
// as. A value from another version is ignored, so the workout in it is lost:
// fields added later are optional instead.
const FORMAT_VERSION = 1

// One key per account: a workout in progress stays with the account that started it.
export function activeWorkoutKey(userId: string) {
  return `levelup:active-workout:${userId}`
}

export function serializeWorkout(workout: ActiveWorkout) {
  return JSON.stringify({ version: FORMAT_VERSION, workout })
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNumberOrNull(value: unknown) {
  return value === null || typeof value === 'number'
}

function isLastSet(value: unknown): value is LastSet {
  return isObject(value) && typeof value.weightKg === 'number' && typeof value.reps === 'number'
}

// A logged set must be valid here too: the rest of the app relies on it.
function isSet(value: unknown): value is ActiveSet {
  if (!isObject(value)) return false
  const { weight, reps, done } = value
  if (typeof weight !== 'string' || typeof reps !== 'string' || typeof done !== 'boolean') return false
  return !done || (setFieldError('weight', weight) === null && setFieldError('reps', reps) === null)
}

// lastSetsUnavailable came after the first workouts were stored; it may be
// missing, and then counts as false (see parseStoredWorkout).
type StoredExercise = Omit<ActiveExercise, 'lastSetsUnavailable'> & { lastSetsUnavailable?: boolean }
type StoredWorkout = Omit<ActiveWorkout, 'exercises'> & { exercises: StoredExercise[] }

function isExercise(value: unknown): value is StoredExercise {
  return (
    isObject(value) &&
    (value.lastSetsUnavailable === undefined || typeof value.lastSetsUnavailable === 'boolean') &&
    typeof value.exerciseId === 'string' &&
    typeof value.name === 'string' &&
    typeof value.targetSets === 'number' &&
    isNumberOrNull(value.repMin) &&
    isNumberOrNull(value.repMax) &&
    typeof value.skipped === 'boolean' &&
    Array.isArray(value.sets) &&
    value.sets.every(isSet) &&
    Array.isArray(value.lastSets) &&
    value.lastSets.every(isLastSet)
  )
}

function isWorkout(value: unknown): value is StoredWorkout {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.routineId === 'string' &&
    typeof value.routineName === 'string' &&
    typeof value.startedAt === 'string' &&
    typeof value.lastSetsUnavailable === 'boolean' &&
    (value.openExerciseId === null || typeof value.openExerciseId === 'string') &&
    Array.isArray(value.exercises) &&
    value.exercises.every(isExercise)
  )
}

// The stored workout, or null for anything else: nothing stored, text that is
// not JSON, another version or the wrong shape. It never throws, so a damaged
// value cannot stop the app from opening.
export function parseStoredWorkout(raw: string | null): ActiveWorkout | null {
  if (raw === null) return null
  let stored: unknown
  try {
    stored = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isObject(stored) || stored.version !== FORMAT_VERSION || !isWorkout(stored.workout)) return null
  const { workout } = stored
  return {
    ...workout,
    exercises: workout.exercises.map((exercise) => ({
      ...exercise,
      lastSetsUnavailable: exercise.lastSetsUnavailable ?? false,
    })),
  }
}
