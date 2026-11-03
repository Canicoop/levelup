import { groupLastSets, type LastSetsByExercise } from '@/features/workout/lib/active-workout'
import { supabase } from '@/lib/supabase'

// "Última vez" for every exercise of a workout, in one request. An exercise
// with no history has no entry.
export async function fetchLastSets(exerciseIds: string[]): Promise<LastSetsByExercise> {
  if (exerciseIds.length === 0) return {}
  const { data, error } = await supabase.rpc('last_exercise_sets', { exercise_ids: exerciseIds })
  if (error) throw error
  return groupLastSets(data)
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
