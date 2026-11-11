import { RoutineNotFoundError, ValidationError, requireRows } from '@/features/workout/lib/errors'
import { cleanName, validateRoutineName } from '@/features/workout/lib/names'
import type { PositionChange, Routine, RoutineSummary, RoutineWithExercises } from '@/features/workout/lib/types'
import { supabase } from '@/lib/supabase'

// All the user's routines, archived included, ordered by (position, created_at),
// each with its number of exercises. `routine_exercises(count)` returns the
// count as a one-row list: [{ count: 6 }].
export async function fetchRoutines(): Promise<RoutineSummary[]> {
  const { data, error } = await supabase
    .from('routines')
    .select('id, name, position, archived_at, created_at, routine_exercises(count)')
    .order('position')
    .order('created_at')
  if (error) throw error
  return data.map(({ routine_exercises, ...routine }) => ({
    ...routine,
    exercise_count: routine_exercises[0]?.count ?? 0,
  }))
}

// Any uuid shape, case-insensitive, as Postgres accepts it.
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// One routine with its exercises and their names. The exercise is embedded
// through the composite foreign key by name; PostgREST builds the join from all
// the key's columns. The list is ordered here, by (position, created_at).
export async function fetchRoutine(id: string): Promise<RoutineWithExercises> {
  // A mistyped address is not a routine: no request needed, and it works offline.
  if (!UUID.test(id)) throw new RoutineNotFoundError()

  const { data, error } = await supabase
    .from('routines')
    .select(
      'id, name, position, archived_at, created_at, exercises:routine_exercises(id, exercise_id, position, target_sets, rep_min, rep_max, created_at, exercise:exercises!routine_exercises_exercise_fkey(id, name, archived_at))',
    )
    .eq('id', id)
    .maybeSingle()
  // 22P02: Postgres refused the id as a uuid. The check above should catch it first.
  if (error?.code === '22P02') throw new RoutineNotFoundError()
  if (error) throw error
  if (!data) throw new RoutineNotFoundError()

  const exercises = [...data.exercises].sort(
    (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at),
  )
  return { ...data, exercises }
}

// Every active routine with its exercises, in one request, to prepare them for
// a workout started without network. Same shape and order as fetchRoutine.
export async function fetchActiveRoutinesWithExercises(): Promise<RoutineWithExercises[]> {
  const { data, error } = await supabase
    .from('routines')
    .select(
      'id, name, position, archived_at, created_at, exercises:routine_exercises(id, exercise_id, position, target_sets, rep_min, rep_max, created_at, exercise:exercises!routine_exercises_exercise_fkey(id, name, archived_at))',
    )
    .is('archived_at', null)
  if (error) throw error
  return data.map((routine) => ({
    ...routine,
    exercises: [...routine.exercises].sort(
      (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at),
    ),
  }))
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
