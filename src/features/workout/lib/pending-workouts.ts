import { isNetworkError } from '@/features/workout/lib/errors'
import type { SubmitWorkoutPayload } from '@/features/workout/lib/workout-payload'

// A finished workout waiting to be sent with submit_workout. The names are kept
// for the summary screen and the "por enviar" line, which must work without
// network. `rejected` marks a workout the database refused (see
// classifySubmitError): it is no longer sent by itself.
export type PendingWorkout = {
  payload: SubmitWorkoutPayload
  routineName: string
  exerciseNames: Record<string, string>
  rejected?: { code: string; at: string }
}

// Raised only for a change older values cannot be read as (see the active
// workout's FORMAT_VERSION): a value from another version is ignored.
const FORMAT_VERSION = 1

// One key per account, like the workout in progress: signing out keeps it.
export function pendingWorkoutsKey(userId: string) {
  return `levelup:pending-workouts:${userId}`
}

export function serializePendingWorkouts(workouts: PendingWorkout[]) {
  return JSON.stringify({ version: FORMAT_VERSION, workouts })
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isDate(value: unknown) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function isPayloadSet(value: unknown) {
  return isObject(value) && typeof value.weight_kg === 'string' && Number.isInteger(value.reps)
}

function isPayloadExercise(value: unknown) {
  return (
    isObject(value) &&
    typeof value.exercise_id === 'string' &&
    Array.isArray(value.sets) &&
    value.sets.length > 0 &&
    value.sets.every(isPayloadSet)
  )
}

function isPayload(value: unknown): value is SubmitWorkoutPayload {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.routine_id === 'string' &&
    isDate(value.started_at) &&
    isDate(value.finished_at) &&
    Array.isArray(value.exercises) &&
    value.exercises.length > 0 &&
    value.exercises.every(isPayloadExercise)
  )
}

function isNames(value: unknown): value is Record<string, string> {
  return isObject(value) && !Array.isArray(value) && Object.values(value).every((name) => typeof name === 'string')
}

function isRejected(value: unknown) {
  return value === undefined || (isObject(value) && typeof value.code === 'string' && isDate(value.at))
}

export function isPendingWorkout(value: unknown): value is PendingWorkout {
  return (
    isObject(value) &&
    isPayload(value.payload) &&
    typeof value.routineName === 'string' &&
    isNames(value.exerciseNames) &&
    isRejected(value.rejected)
  )
}

// The stored list, or an empty one for nothing stored, text that is not JSON,
// another version or the wrong shape. Each workout is checked on its own, so a
// damaged one does not take the others with it. It never throws.
export function parsePendingWorkouts(raw: string | null): PendingWorkout[] {
  if (raw === null) return []
  let stored: unknown
  try {
    stored = JSON.parse(raw)
  } catch {
    return []
  }
  if (!isObject(stored) || stored.version !== FORMAT_VERSION || !Array.isArray(stored.workouts)) return []
  return stored.workouts.filter(isPendingWorkout)
}

// Adds a finished workout at the end. The same id replaces the one there, so
// finishing twice (the app closed half way) never queues it twice.
export function addPendingWorkout(workouts: PendingWorkout[], workout: PendingWorkout) {
  const id = workout.payload.id
  return workouts.some((current) => current.payload.id === id)
    ? workouts.map((current) => (current.payload.id === id ? workout : current))
    : [...workouts, workout]
}

export function removePendingWorkout(workouts: PendingWorkout[], id: string) {
  return workouts.filter((current) => current.payload.id !== id)
}

export function markPendingRejected(workouts: PendingWorkout[], id: string, code: string, at: string) {
  return workouts.map((current) => (current.payload.id === id ? { ...current, rejected: { code, at } } : current))
}

// "Tentar outra vez" on a refused workout: it is sent by itself again.
export function clearPendingRejected(workouts: PendingWorkout[], id: string) {
  return workouts.map((current) => {
    if (current.payload.id !== id || !current.rejected) return current
    return { payload: current.payload, routineName: current.routineName, exerciseNames: current.exerciseNames }
  })
}

// The workouts sent by themselves, oldest first.
export function sendablePendingWorkouts(workouts: PendingWorkout[]) {
  return workouts
    .filter((current) => !current.rejected)
    .toSorted((a, b) => Date.parse(a.payload.finished_at) - Date.parse(b.payload.finished_at))
}

// Errors that sending again cannot fix: the payload itself is refused (see
// submit_workout in docs/decisions.md).
const REJECTED_CODES = new Set(['22023', '23514', '23505', '23503', '23502', '22P02', '22007', '42501'])

export type SubmitOutcome = { kind: 'retry' } | { kind: 'rejected'; code: string }

function codeOf(error: unknown) {
  return isObject(error) && typeof error.code === 'string' ? error.code : ''
}

function messageOf(error: unknown) {
  return isObject(error) && typeof error.message === 'string' ? error.message : ''
}

// What to do with a failed send. Anything that may pass later stays in the
// queue: no network, a request that took too long, a server error, an unknown
// error, and above all the session. A session that expired (or no session at
// all, sent as anon) is a 401 from PostgREST, with PGRST301 for an expired JWT,
// or 42501 when the anon role may not run the function; it always waits for a
// new session, even with a code that would otherwise be refused. `status` is the
// HTTP status of the response, when there was one.
export function classifySubmitError(error: unknown, status: number | null): SubmitOutcome {
  if (isNetworkError(error)) return { kind: 'retry' }
  if (status === 401) return { kind: 'retry' }

  const code = codeOf(error)
  // PGRST3xx are PostgREST's JWT errors (expired, invalid, missing claims).
  if (code.startsWith('PGRST3') || /JWT/i.test(messageOf(error))) return { kind: 'retry' }

  return REJECTED_CODES.has(code) ? { kind: 'rejected', code } : { kind: 'retry' }
}
