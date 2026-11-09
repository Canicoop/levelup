import { groupLastSets, type LastSetsByExercise } from '@/features/workout/lib/active-workout'
import { isNetworkError } from '@/features/workout/lib/errors'
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

// "Última vez" is a help, not a requirement: without network (or after
// REQUEST_LIMIT_MS) it comes back empty and marked unavailable, so a workout can
// start, or an exercise join it, anyway. Any other failure is a real error.
export async function fetchLastSetsIfOnline(
  exerciseIds: string[],
): Promise<{ lastSets: LastSetsByExercise; lastSetsUnavailable: boolean }> {
  try {
    return { lastSets: await withTimeout(fetchLastSets(exerciseIds), REQUEST_LIMIT_MS), lastSetsUnavailable: false }
  } catch (error) {
    if (isNetworkError(error)) return { lastSets: {}, lastSetsUnavailable: true }
    throw error
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
