const EXERCISE_NAME_MAX = 80
const ROUTINE_NAME_MAX = 60

// Trims the ends and turns any run of whitespace into one space, so
// "Supino  inclinado" and "Supino inclinado" are the same name.
export function cleanName(raw: string) {
  return raw.trim().replace(/\s+/g, ' ')
}

// Counts characters the way Postgres char_length does (code points), so an
// emoji counts as one character, not as two UTF-16 units.
function characterCount(text: string) {
  return Array.from(text).length
}

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
