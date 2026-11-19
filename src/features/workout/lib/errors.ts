import { getErrorMessage } from '@/lib/errors'

// A routine opened by id that does not exist.
export class RoutineNotFoundError extends Error {
  constructor() {
    super('Routine not found')
    this.name = 'RoutineNotFoundError'
  }
}

// An exercise name that is already taken, when creating or renaming.
export class DuplicateExerciseError extends Error {
  readonly when: 'create' | 'rename'

  constructor(when: 'create' | 'rename') {
    super('An exercise with this name already exists')
    this.name = 'DuplicateExerciseError'
    this.when = when
  }
}

// Adding an exercise that the routine already has (the unique key on
// routine_exercises (routine_id, exercise_id), 23505).
export class AlreadyInRoutineError extends Error {
  constructor() {
    super('The exercise is already in the routine')
    this.name = 'AlreadyInRoutineError'
  }
}

// A short message in European Portuguese for any error of the Workout data
// layer: its own errors first, then the shared messages (src/lib/errors.ts).
export function workoutErrorMessage(error: unknown, messages: { duplicate?: string } = {}) {
  if (error instanceof RoutineNotFoundError) return 'Rotina não encontrada.'
  if (error instanceof DuplicateExerciseError) {
    return error.when === 'rename'
      ? 'Já existe um exercício com esse nome. Se estiver arquivado, reativa-o em Arquivados.'
      : 'Já existe um exercício com esse nome.'
  }
  if (error instanceof AlreadyInRoutineError) return 'Este exercício já está na rotina.'
  return getErrorMessage(error, messages)
}
