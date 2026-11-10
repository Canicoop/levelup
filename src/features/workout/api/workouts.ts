import type { QueryClient } from '@tanstack/react-query'
import { workoutKeys } from '@/features/workout/api/query-keys'
import { groupLastSets, type LastSetsByExercise } from '@/features/workout/lib/active-workout'
import { isNetworkError } from '@/features/workout/lib/errors'
import {
  lastSetsFromCopy,
  mergeLastSetsCopy,
  overlayPendingLastSets,
  overlayPendingRoutineId,
  type LastSetsCopy,
} from '@/features/workout/lib/last-sets-copy'
import { classifySubmitError, sendablePendingWorkouts, type SubmitOutcome } from '@/features/workout/lib/pending-workouts'
import { withTimeout } from '@/features/workout/lib/with-timeout'
import type { SubmitWorkoutPayload } from '@/features/workout/lib/workout-payload'
import { getPendingWorkouts } from '@/features/workout/pending-workouts-store'
import { supabase } from '@/lib/supabase'

// The finished workouts not in the database yet, which every read below lays
// over what the database returns (see overlayPendingLastSets).
function pendingPayloads() {
  return sendablePendingWorkouts(getPendingWorkouts()).map((pending) => pending.payload)
}

// "Última vez" for every exercise of a workout, in one request. An exercise
// with no history has no entry.
export async function fetchLastSets(exerciseIds: string[]): Promise<LastSetsByExercise> {
  if (exerciseIds.length === 0) return {}
  const { data, error } = await supabase.rpc('last_exercise_sets', { exercise_ids: exerciseIds })
  if (error) throw error
  return overlayPendingLastSets(groupLastSets(data), exerciseIds, pendingPayloads())
}

// Sends one finished workout. It is idempotent (see submit_workout), so sending
// it again after a timeout, or from another tab, cannot create a second one.
// Never throws: the outcome says whether it is saved, or what to do with it.
export async function submitWorkout(payload: SubmitWorkoutPayload): Promise<{ kind: 'saved' } | SubmitOutcome> {
  try {
    const { error, status } = await withTimeout(supabase.rpc('submit_workout', { workout: payload }), REQUEST_LIMIT_MS)
    return error ? classifySubmitError(error, status) : { kind: 'saved' }
  } catch (error) {
    return classifySubmitError(error, null)
  }
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
// the routine list, it gives the next routine (see nextRoutine). A workout
// still waiting to be sent counts as the last one.
export async function fetchLastRoutineId() {
  const { data, error } = await supabase
    .from('workouts')
    .select('routine_id')
    .order('finished_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return overlayPendingRoutineId(data?.routine_id ?? null, pendingPayloads())
}
