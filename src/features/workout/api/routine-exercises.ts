import { requireRows } from '@/features/workout/lib/errors'
import type { NewRoutineExercise, PositionChange, RoutineExerciseChanges } from '@/features/workout/lib/types'
import { supabase } from '@/lib/supabase'

export async function addRoutineExercise(entry: NewRoutineExercise) {
  const { error } = await supabase.from('routine_exercises').insert(entry)
  if (error) throw error
}

export async function removeRoutineExercise(id: string) {
  const { data, error } = await supabase.from('routine_exercises').delete().eq('id', id).select('id')
  if (error) throw error
  requireRows(data)
}

export async function updateRoutineExercise(id: string, changes: RoutineExerciseChanges) {
  const { data, error } = await supabase.from('routine_exercises').update(changes).eq('id', id).select('id')
  if (error) throw error
  requireRows(data)
}

// One update per changed row; see updateRoutinePositions.
export async function updateRoutineExercisePositions(changes: PositionChange[]) {
  await Promise.all(changes.map(({ id, position }) => updateRoutineExercise(id, { position })))
}
