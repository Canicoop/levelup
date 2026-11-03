import { removeExerciseFromAllRoutines } from '@/features/workout/api/routine-exercises'
import { DuplicateExerciseError, ValidationError, requireRows } from '@/features/workout/lib/errors'
import { isExerciseNameTaken, resolveNewExercise } from '@/features/workout/lib/exercise-search'
import { cleanName, validateExerciseName } from '@/features/workout/lib/names'
import type { Exercise } from '@/features/workout/lib/types'
import { supabase } from '@/lib/supabase'

// Sorted here rather than in the database: the database orders text by its own
// collation, which may not be Portuguese (accents, upper and lower case).
const collator = new Intl.Collator('pt-PT')

// All the user's exercises, archived included, ordered by name.
export async function fetchExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase.from('exercises').select('id, name, archived_at')
  if (error) throw error
  return [...data].sort((a, b) => collator.compare(a.name, b.name))
}

function cleanExerciseName(name: string) {
  const clean = cleanName(name)
  const invalid = validateExerciseName(clean)
  if (invalid) throw new ValidationError(invalid)
  return clean
}

async function updateExercise(id: string, changes: { name?: string; archived_at?: string | null }) {
  const { data, error } = await supabase.from('exercises').update(changes).eq('id', id).select('id')
  if (error) throw error
  requireRows(data)
}

async function reactivate(exercise: Exercise) {
  await updateExercise(exercise.id, { archived_at: null })
  return { exercise: { ...exercise, archived_at: null }, reactivated: true }
}

// Creates an exercise, or reactivates an archived one with the same name
// (ignoring case and accents). An active one with the same name is refused. `existing` is
// the list the user is looking at; if another tab created the name meanwhile,
// the database's unique violation (23505) leads to the same decision on a
// fresh list.
export async function createExercise(
  name: string,
  existing: Exercise[],
): Promise<{ exercise: Exercise; reactivated: boolean }> {
  const clean = cleanExerciseName(name)

  const decision = resolveNewExercise(existing, clean)
  if (decision.action === 'duplicate') throw new DuplicateExerciseError('create')
  if (decision.action === 'reactivate') return reactivate(decision.exercise)

  const { data, error } = await supabase
    .from('exercises')
    .insert({ name: clean })
    .select('id, name, archived_at')
    .single()
  if (!error) return { exercise: data, reactivated: false }
  if (error.code !== '23505') throw error

  const retry = resolveNewExercise(await fetchExercises(), clean)
  if (retry.action === 'reactivate') return reactivate(retry.exercise)
  throw new DuplicateExerciseError('create')
}

// `existing` is the full list (archived included). A name that another exercise
// has, ignoring case and accents, is refused here; the database only catches
// the same name ignoring case (23505), turned into the same error.
export async function renameExercise(id: string, name: string, existing: Exercise[]) {
  const clean = cleanExerciseName(name)
  if (isExerciseNameTaken(existing, clean, id)) throw new DuplicateExerciseError('rename')
  try {
    await updateExercise(id, { name: clean })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      throw new DuplicateExerciseError('rename')
    }
    throw error
  }
}

// requireRows applies here (through updateExercise): the exercise itself must exist.
export function setExerciseArchived(id: string, archived: boolean) {
  return updateExercise(id, { archived_at: archived ? new Date().toISOString() : null })
}

// Archiving takes the exercise out of every routine first, then archives it.
// Two steps, not one transaction: if the second fails, the exercise is out of
// its routines but still active. That is a valid state (an active exercise in
// no routine), and archiving again finishes the job. The other order could
// leave an archived exercise inside routines.
// Removing deletes 0 rows for an exercise in no routine, which is fine (see
// removeExerciseFromAllRoutines); only the archive step requires a row.
export async function archiveExercise(id: string) {
  await removeExerciseFromAllRoutines(id)
  await setExerciseArchived(id, true)
}
