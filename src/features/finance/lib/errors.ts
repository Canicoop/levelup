import { NotFoundError, getErrorMessage } from '@/lib/errors'

// A category name that is already taken in its kind, when creating or renaming.
export class DuplicateCategoryError extends Error {
  readonly when: 'create' | 'rename'

  constructor(when: 'create' | 'rename') {
    super('A category with this name already exists')
    this.name = 'DuplicateCategoryError'
    this.when = when
  }
}

// A transaction dated after Lisbon's today, refused by the insert or update
// policy. The form already refuses tomorrow, so this only happens when
// midnight passes between opening the form and saving it, or with a wrong
// clock.
export class FutureDayError extends Error {
  constructor() {
    super("The day is after Lisbon's today")
    this.name = 'FutureDayError'
  }
}

// A write that points at a category that no longer fits (23503): deleted, or
// not of the right kind.
export class CategoryUnavailableError extends Error {
  constructor() {
    super('The category is not available')
    this.name = 'CategoryUnavailableError'
  }
}

function field(error: unknown, name: 'code' | 'message') {
  if (typeof error === 'object' && error !== null && name in error) {
    const value = (error as Record<string, unknown>)[name]
    if (typeof value === 'string') return value
  }
  return ''
}

// Whether a Data API error has this Postgres code (23505, 23503…).
export function hasCode(error: unknown, code: string) {
  return field(error, 'code') === code
}

// The error a write that uses a category throws: a foreign key violation
// (23503) means the category no longer fits; anything else is left as it is.
export function categoryWriteError(error: unknown): unknown {
  return hasCode(error, '23503') ? new CategoryUnavailableError() : error
}

// The error a transaction write throws. A 42501 whose message is about the
// row-level security policy is the day after Lisbon's today, the only extra
// condition of those policies. A 42501 about privileges ("permission denied")
// is left as it is, for getErrorMessage.
export function transactionWriteError(error: unknown): unknown {
  if (hasCode(error, '42501') && /row-level security/i.test(field(error, 'message'))) return new FutureDayError()
  return categoryWriteError(error)
}

// A short message in European Portuguese for any error of the Finance data
// layer: its own errors first, then the shared messages (network, database codes).
export function financeErrorMessage(error: unknown) {
  if (error instanceof DuplicateCategoryError) {
    return error.when === 'rename'
      ? 'Já existe uma categoria com esse nome. Se estiver arquivada, reativa-a em Arquivadas.'
      : 'Já existe uma categoria com esse nome.'
  }
  if (error instanceof FutureDayError) return 'A data não pode ser depois de hoje.'
  if (error instanceof CategoryUnavailableError) return 'Esta categoria já não está disponível. Escolhe outra.'
  if (error instanceof NotFoundError) return 'Este registo já não existe.'
  return getErrorMessage(error)
}
