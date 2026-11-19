import { validateExerciseName } from '@/features/workout/lib/names'
import type { Exercise } from '@/features/workout/lib/types'
import { cleanName, searchKey } from '@/lib/text'

// Exercise names are compared with searchKey (src/lib/text.ts): cleaned, lower
// case and without accents.
export function findExerciseByName(exercises: Exercise[], name: string) {
  const key = searchKey(name)
  return exercises.find((exercise) => searchKey(exercise.name) === key)
}

// Whether another exercise (not `exceptId`, the one being renamed) already has
// this name. An exercise can be renamed to an accent or case variant of itself.
export function isExerciseNameTaken(exercises: Exercise[], name: string, exceptId: string) {
  return findExerciseByName(
    exercises.filter((exercise) => exercise.id !== exceptId),
    name,
  ) !== undefined
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

// The exercises whose name contains the query anywhere. An empty query keeps
// them all, in the order given.
export function filterExercises(exercises: Exercise[], query: string) {
  const key = searchKey(query)
  if (key === '') return exercises
  return exercises.filter((exercise) => searchKey(exercise.name).includes(key))
}

// Whether to offer "Criar “…”": a valid name that no exercise, active or
// archived, already has (the same comparison as resolveNewExercise). An archived
// one with that name is shown in the results instead.
export function canCreateExercise(exercises: Exercise[], query: string) {
  const name = cleanName(query)
  return validateExerciseName(name) === null && findExerciseByName(exercises, name) === undefined
}
