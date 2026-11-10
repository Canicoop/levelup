import type { QueryClient } from '@tanstack/react-query'
import { workoutKeys } from '@/features/workout/api/query-keys'
import { groupLastSets, type LastSetsByExercise } from '@/features/workout/lib/active-workout'
import { isNetworkError } from '@/features/workout/lib/errors'
import { lastSetsFromCopy, mergeLastSetsCopy, type LastSetsCopy } from '@/features/workout/lib/last-sets-copy'
import { withTimeout } from '@/features/workout/lib/with-timeout'
import { supabase } from '@/lib/supabase'

// "Última vez" for every exercise of a workout, in one request. An exercise
// with no history has no entry.
export async function fetchLastSets(exerciseIds: string[]): Promise<LastSetsByExercise> {
  if (exerciseIds.length === 0) return {}
  const { data, error } = await supabase.rpc('last_exercise_sets', { exercise_ids: exerciseIds })
  if (error) throw error
  return groupLastSets(data)
}

// A weak gym connection can hang instead of failing.
export const REQUEST_LIMIT_MS = 8000

// Keeps a fresh read in the copy kept on the device (see lastSetsFromCopy).
export function saveLastSetsCopy(queryClient: QueryClient, exerciseIds: string[], lastSets: LastSetsByExercise) {
  queryClient.setQueryData<LastSetsCopy>(workoutKeys.lastSetsCopy(), (copy) =>
    mergeLastSetsCopy(copy, exerciseIds, lastSets),
  )
}

// "Última vez" is a help, not a requirement. It is read from the network, with
// REQUEST_LIMIT_MS; without network it comes from the copy on the device, and
// only when the copy does not cover these exercises either is it marked
// unavailable, so a workout can start, or an exercise join it, anyway. Any
// other failure is a real error.
export async function fetchLastSetsIfOnline(
  queryClient: QueryClient,
  exerciseIds: string[],
): Promise<{ lastSets: LastSetsByExercise; lastSetsUnavailable: boolean }> {
  try {
    const lastSets = await withTimeout(fetchLastSets(exerciseIds), REQUEST_LIMIT_MS)
    saveLastSetsCopy(queryClient, exerciseIds, lastSets)
    return { lastSets, lastSetsUnavailable: false }
  } catch (error) {
    if (!isNetworkError(error)) throw error
    const fromCopy = lastSetsFromCopy(queryClient.getQueryData<LastSetsCopy>(workoutKeys.lastSetsCopy()), exerciseIds)
    return fromCopy ? { lastSets: fromCopy, lastSetsUnavailable: false } : { lastSets: {}, lastSetsUnavailable: true }
  }
}

// The routine of the last finished workout, or null before the first one. With
// the routine list, it gives the next routine (see nextRoutine).
export async function fetchLastRoutineId() {
  const { data, error } = await supabase
    .from('workouts')
    .select('routine_id')
    .order('finished_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.routine_id ?? null
}
