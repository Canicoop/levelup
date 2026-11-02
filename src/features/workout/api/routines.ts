import { RoutineNotFoundError, ValidationError, requireRows } from '@/features/workout/lib/errors'
import { cleanName, validateRoutineName } from '@/features/workout/lib/names'
import type { PositionChange, Routine, RoutineWithExercises } from '@/features/workout/lib/types'
import { supabase } from '@/lib/supabase'

// All the user's routines, archived included, ordered by (position, created_at).
export async function fetchRoutines(): Promise<Routine[]> {
  const { data, error } = await supabase
    .from('routines')
    .select('id, name, position, archived_at, created_at')
    .order('position')
    .order('created_at')
  if (error) throw error
  return data
}

// One routine with its exercises and their names. The exercise is embedded
// through the composite foreign key by name; PostgREST builds the join from all
// the key's columns. The list is ordered here, by (position, created_at).
export async function fetchRoutine(id: string): Promise<RoutineWithExercises> {
  const { data, error } = await supabase
    .from('routines')
    .select(
      'id, name, position, archived_at, created_at, exercises:routine_exercises(id, exercise_id, position, target_sets, rep_min, rep_max, created_at, exercise:exercises!routine_exercises_exercise_fkey(id, name, archived_at))',
    )
    .eq('id', id)
    .maybeSingle()
  // 22P02: the id is not even a uuid (a mistyped address).
  if (error?.code === '22P02') throw new RoutineNotFoundError()
  if (error) throw error
  if (!data) throw new RoutineNotFoundError()

  const exercises = [...data.exercises].sort(
    (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at),
  )
  return { ...data, exercises }
}

function cleanRoutineName(name: string) {
  const clean = cleanName(name)
  const invalid = validateRoutineName(clean)
  if (invalid) throw new ValidationError(invalid)
  return clean
}

async function updateRoutine(id: string, changes: { name?: string; position?: number; archived_at?: string | null }) {
  const { data, error } = await supabase.from('routines').update(changes).eq('id', id).select('id')
  if (error) throw error
  requireRows(data)
}

export async function createRoutine(name: string, position: number): Promise<Routine> {
  const { data, error } = await supabase
    .from('routines')
    .insert({ name: cleanRoutineName(name), position })
    .select('id, name, position, archived_at, created_at')
    .single()
  if (error) throw error
  return data
}

export function renameRoutine(id: string, name: string) {
  return updateRoutine(id, { name: cleanRoutineName(name) })
}

// Archiving keeps the position. Reactivating takes the given position, the end
// of the active list, so the routine does not land on top of another.
export function setRoutineArchived(id: string, archived: boolean, position?: number) {
  return updateRoutine(id, {
    archived_at: archived ? new Date().toISOString() : null,
    ...(position === undefined ? {} : { position }),
  })
}

// One update per changed row. Positions are not unique, so a failure halfway
// leaves a valid order, and moving again fixes it.
export async function updateRoutinePositions(changes: PositionChange[]) {
  await Promise.all(changes.map(({ id, position }) => updateRoutine(id, { position })))
}
