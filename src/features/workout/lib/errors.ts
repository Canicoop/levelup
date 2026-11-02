// A row that was updated or deleted no longer exists (or is not the user's).
export class NotFoundError extends Error {
  constructor() {
    super('The row no longer exists')
    this.name = 'NotFoundError'
  }
}

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

// Input refused before it reaches the database. The message is already in
// European Portuguese and is shown as it is.
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Supabase reports an update or delete that matched no row as success with no
// rows, so callers ask for the ids back and use this to turn "nothing" into an error.
export function requireRows<T>(rows: T[] | null): T[] {
  if (!rows || rows.length === 0) throw new NotFoundError()
  return rows
}

const NETWORK_MESSAGE = 'Sem ligação. Tenta outra vez quando voltares a estar online.'

function messageOf(error: unknown) {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return ''
}

function codeOf(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
    return error.code
  }
  return null
}

// fetch failures read "Failed to fetch" (Chrome), "Load failed" (Safari) or
// "NetworkError when attempting to fetch resource" (Firefox).
function isNetworkError(error: unknown) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  if (error instanceof Error && error.name === 'AuthRetryableFetchError') return true
  return /Failed to fetch|Load failed|NetworkError/.test(messageOf(error))
}

// A short message in European Portuguese for any error from the data layer.
// messages.duplicate replaces the generic text for a unique violation (23505).
export function getErrorMessage(error: unknown, messages: { duplicate?: string } = {}) {
  if (error instanceof ValidationError) return error.message
  if (error instanceof RoutineNotFoundError) return 'Rotina não encontrada.'
  if (error instanceof NotFoundError) return 'Este item já não existe.'
  if (error instanceof DuplicateExerciseError) {
    return error.when === 'rename'
      ? 'Já existe um exercício com esse nome. Se estiver arquivado, reativa-o em Arquivadas.'
      : 'Já existe um exercício com esse nome.'
  }
  if (isNetworkError(error)) return NETWORK_MESSAGE

  switch (codeOf(error)) {
    case '23505':
      return messages.duplicate ?? 'Isso já existe.'
    case '23514':
      return 'Há um valor fora dos limites.'
    case '23503':
      return 'Este item já não existe.'
    case '42501':
      return 'Não tens permissão para fazer isto.'
    default:
      return 'Algo correu mal. Tenta outra vez.'
  }
}
