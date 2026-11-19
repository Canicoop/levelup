import { NotFoundError, getErrorMessage } from '@/lib/errors'

// Lisbon's day changed between opening the sheet and saving: the value was
// meant for the day before, so it is not sent (see docs/decisions.md, Weight module).
export class DayChangedError extends Error {
  constructor() {
    super("Lisbon's day changed since the sheet opened")
    this.name = 'DayChangedError'
  }
}

// A short message in European Portuguese for any error of the Weight data layer.
export function weightErrorMessage(error: unknown) {
  if (error instanceof DayChangedError) return 'O dia mudou. Regista o peso de hoje.'
  if (error instanceof NotFoundError) return 'Este registo já não existe.'
  return getErrorMessage(error)
}
