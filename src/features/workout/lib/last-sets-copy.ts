import type { LastSetsByExercise } from '@/features/workout/lib/active-workout'
import type { SubmitWorkoutPayload } from '@/features/workout/lib/workout-payload'

// A copy of "Última vez" kept on the device, for when there is no network. It
// records which exercises were asked for, since an exercise with no history has
// no entry in `lastSets`: without `exerciseIds`, "no entry" could mean either a
// first time or never asked.
export type LastSetsCopy = { exerciseIds: string[]; lastSets: LastSetsByExercise }

// "Última vez" for these exercises from the copy, or null if the copy does not
// cover all of them (then it is not known).
export function lastSetsFromCopy(copy: LastSetsCopy | undefined, exerciseIds: string[]): LastSetsByExercise | null {
  if (!copy) return null
  const known = new Set(copy.exerciseIds)
  if (!exerciseIds.every((id) => known.has(id))) return null
  const lastSets: LastSetsByExercise = {}
  for (const id of exerciseIds) {
    const sets = copy.lastSets[id]
    if (sets) lastSets[id] = sets
  }
  return lastSets
}

// Adds a fresh read to the copy: those exercises take the new value, including
// "no history" for those without an entry.
export function mergeLastSetsCopy(
  copy: LastSetsCopy | undefined,
  exerciseIds: string[],
  lastSets: LastSetsByExercise,
): LastSetsCopy {
  const merged: LastSetsByExercise = { ...copy?.lastSets }
  for (const id of exerciseIds) {
    if (lastSets[id]) merged[id] = lastSets[id]
    else delete merged[id]
  }
  return { exerciseIds: [...new Set([...(copy?.exerciseIds ?? []), ...exerciseIds])], lastSets: merged }
}

// "Última vez" as a finished workout leaves it: the sets just done, for the
// exercises it sends. The weight is the payload's text ("22.5"), read as a
// number only for showing it, like the rows of last_exercise_sets.
export function lastSetsFromPayload(payload: SubmitWorkoutPayload): LastSetsByExercise {
  const lastSets: LastSetsByExercise = {}
  for (const exercise of payload.exercises) {
    lastSets[exercise.exercise_id] = exercise.sets.map((set) => ({ weightKg: Number(set.weight_kg), reps: set.reps }))
  }
  return lastSets
}

function byFinish(a: SubmitWorkoutPayload, b: SubmitWorkoutPayload) {
  return Date.parse(a.finished_at) - Date.parse(b.finished_at)
}

// A read from the network does not know the workouts still waiting to be sent,
// so it would bring back older values. Those workouts are laid over it, the
// latest last: they are newer than anything in the database. Only the
// exercises asked for are touched.
export function overlayPendingLastSets(
  lastSets: LastSetsByExercise,
  exerciseIds: string[],
  pending: SubmitWorkoutPayload[],
): LastSetsByExercise {
  const asked = new Set(exerciseIds)
  const result: LastSetsByExercise = { ...lastSets }
  for (const payload of pending.toSorted(byFinish)) {
    for (const [id, sets] of Object.entries(lastSetsFromPayload(payload))) {
      if (asked.has(id)) result[id] = sets
    }
  }
  return result
}

// The routine of the last workout, with the workouts waiting to be sent: the
// latest of those, otherwise what the database says.
export function overlayPendingRoutineId(routineId: string | null, pending: SubmitWorkoutPayload[]) {
  return pending.toSorted(byFinish).at(-1)?.routine_id ?? routineId
}
