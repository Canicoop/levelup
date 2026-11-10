import type { LastSetsByExercise } from '@/features/workout/lib/active-workout'

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
