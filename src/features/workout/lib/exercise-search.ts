import { cleanName } from '@/features/workout/lib/names'
import type { Exercise } from '@/features/workout/lib/types'

// The database compares lower(name) on names that are already trimmed; this is
// the same comparison on cleaned names.
function nameKey(name: string) {
  return cleanName(name).toLocaleLowerCase('pt-PT')
}

export function findExerciseByName(exercises: Exercise[], name: string) {
  const key = nameKey(name)
  return exercises.find((exercise) => nameKey(exercise.name) === key)
}

// What creating an exercise with this name should do: create it, reactivate an
// archived one with the same name, or refuse because an active one exists.
export function resolveNewExercise(
  exercises: Exercise[],
  name: string,
): { action: 'create' } | { action: 'reactivate'; exercise: Exercise } | { action: 'duplicate' } {
  const existing = findExerciseByName(exercises, name)
  if (!existing) return { action: 'create' }
  if (existing.archived_at) return { action: 'reactivate', exercise: existing }
  return { action: 'duplicate' }
}
