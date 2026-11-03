import { AlreadyInRoutineError, requireRows } from '@/features/workout/lib/errors'
import type {
  ExerciseRoutine,
  NewRoutineExercise,
  PositionChange,
  RoutineExerciseChanges,
} from '@/features/workout/lib/types'
import { supabase } from '@/lib/supabase'

// A unique violation (23505) here can only be routine_exercises_one_per_routine:
// the exercise is already in the routine (added from another tab, say).
export async function addRoutineExercise(entry: NewRoutineExercise) {
  const { error } = await supabase.from('routine_exercises').insert(entry)
  if (error?.code === '23505') throw new AlreadyInRoutineError()
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

// The routines, active and archived, that contain an exercise, ordered by name.
// The routine is embedded through the composite foreign key by name, as in
// fetchRoutine.
const collator = new Intl.Collator('pt-PT')

export async function fetchExerciseRoutines(exerciseId: string): Promise<ExerciseRoutine[]> {
  const { data, error } = await supabase
    .from('routine_exercises')
    .select('routine:routines!routine_exercises_routine_fkey(id, name, archived_at)')
    .eq('exercise_id', exerciseId)
  if (error) throw error
  return data.map(({ routine }) => routine).sort((a, b) => collator.compare(a.name, b.name))
}

// Removes an exercise from every routine in one statement. No requireRows:
// an exercise in no routine deletes 0 rows, and that is a success, not a
// missing row.
export async function removeExerciseFromAllRoutines(exerciseId: string) {
  const { error } = await supabase.from('routine_exercises').delete().eq('exercise_id', exerciseId)
  if (error) throw error
}
