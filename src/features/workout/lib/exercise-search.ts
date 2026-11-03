import { cleanName, validateExerciseName } from '@/features/workout/lib/names'
import type { Exercise } from '@/features/workout/lib/types'

// The key that decides when two exercise names are "the same name", and what a
// search matches: cleaned, lower case and without accents. NFD splits "ç" into
// "c" plus a combining mark, and the marks are removed, so "Supino",
// "SUPINO" and "Supinó" share a key and "elevacao" finds "Elevação lateral".
// The database is stricter (lower(name): accents count) and stays as the
// safety net; the app refuses names that differ only in accents before they
// get there.
export function searchKey(text: string) {
  return cleanName(text).toLocaleLowerCase('pt-PT').normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

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
