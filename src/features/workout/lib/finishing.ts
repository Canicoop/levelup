import type { ActiveWorkout } from '@/features/workout/lib/active-workout'

// A workout whose last set was logged more than this long ago finishes at that
// set (rule AS): it was left open by mistake.
export const LATE_FINISH_MS = 60 * 60_000

// The database refuses a workout longer than this (workouts_duration_check).
export const MAX_WORKOUT_MS = 24 * 60 * 60_000

// Why the finish time is what it is, for the confirmation:
// - now: the time "Terminar" was tapped;
// - last-set: the last set was more than an hour ago ("Terminado às 19:42, a
//   hora da última série");
// - limit: even so it would be over 24 hours, so it finishes 24 hours after the
//   start ("Terminado às 19:42, 24 horas depois do início").
export type FinishReason = 'now' | 'last-set' | 'limit'

export type FinishTime = { finishedAt: string; reason: FinishReason }

// The sets that are sent: with ✓, in exercises that were not skipped.
function sentSets(workout: ActiveWorkout) {
  return workout.exercises.flatMap((exercise) => (exercise.skipped ? [] : exercise.sets.filter((set) => set.done)))
}

// The time of the last set that is sent, or null when none has a time (sets
// logged before doneAt existed).
export function lastLoggedAt(workout: ActiveWorkout): number | null {
  let last: number | null = null
  for (const set of sentSets(workout)) {
    const time = set.doneAt === undefined ? Number.NaN : Date.parse(set.doneAt)
    if (!Number.isNaN(time) && (last === null || time > last)) last = time
  }
  return last
}

// The finish time of a workout finished at `now` (ISO). It is always between the
// start and 24 hours after it, so the database never refuses it (23514) and no
// set is lost. A finish before the start (a clock that went back) is moved to
// the start, without a reason of its own: the confirmation has nothing to say.
export function finishTime(workout: ActiveWorkout, now: string): FinishTime {
  const start = Date.parse(workout.startedAt)
  let finish = Date.parse(now)
  let reason: FinishReason = 'now'

  const last = lastLoggedAt(workout)
  if (last !== null && finish - last > LATE_FINISH_MS) {
    finish = last
    reason = 'last-set'
  }
  if (finish - start > MAX_WORKOUT_MS) {
    finish = start + MAX_WORKOUT_MS
    reason = 'limit'
  }
  if (finish < start) {
    finish = start
    reason = 'now'
  }

  return { finishedAt: new Date(finish).toISOString(), reason }
}

// For the confirmation: "15 séries registadas. Faltam 3, que não são guardadas."
// Skipped exercises count for neither: they are not sent, and were set aside on
// purpose.
export function finishCounts(workout: ActiveWorkout) {
  let logged = 0
  let missing = 0
  for (const exercise of workout.exercises) {
    if (exercise.skipped) continue
    for (const set of exercise.sets) {
      if (set.done) logged++
      else missing++
    }
  }
  return { logged, missing }
}
