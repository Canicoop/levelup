import { characterCount } from '@/lib/text'

const EXERCISE_NAME_MAX = 80
const ROUTINE_NAME_MAX = 60

function validateName(name: string, max: number) {
  const length = characterCount(name)
  if (length === 0) return 'Escreve um nome.'
  if (length > max) return `O nome pode ter até ${max} caracteres.`
  return null
}

// Both expect a name already passed through cleanName. They return the error
// message in European Portuguese, or null when the name is valid.
export function validateExerciseName(name: string) {
  return validateName(name, EXERCISE_NAME_MAX)
}

export function validateRoutineName(name: string) {
  return validateName(name, ROUTINE_NAME_MAX)
}
