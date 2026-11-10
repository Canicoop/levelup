import { isPendingWorkout, type PendingWorkout } from '@/features/workout/lib/pending-workouts'

// The last finished workout, for the summary screen ("Treino terminado"). It is
// kept apart from the queue, which a workout leaves once it is sent, so the
// summary can still say "Guardado". It also survives iOS closing the app on
// that screen. "Concluído" removes it.

const FORMAT_VERSION = 1

export function lastFinishedKey(userId: string) {
  return `levelup:last-finished:${userId}`
}

export function serializeLastFinished(workout: PendingWorkout) {
  return JSON.stringify({ version: FORMAT_VERSION, workout })
}

// The stored workout, or null for anything else. It never throws.
export function parseLastFinished(raw: string | null): PendingWorkout | null {
  if (raw === null) return null
  let stored: unknown
  try {
    stored = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof stored !== 'object' || stored === null || !('version' in stored) || !('workout' in stored)) return null
  return stored.version === FORMAT_VERSION && isPendingWorkout(stored.workout) ? stored.workout : null
}
