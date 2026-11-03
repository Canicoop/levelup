import { describe, expect, it } from 'vitest'
import {
  AlreadyInRoutineError,
  DuplicateExerciseError,
  NotFoundError,
  RoutineNotFoundError,
  ValidationError,
  getErrorMessage,
  requireRows,
} from '@/features/workout/lib/errors'

describe('requireRows', () => {
  it('returns the rows when there is at least one', () => {
    expect(requireRows([{ id: '1' }])).toEqual([{ id: '1' }])
  })

  it.each([
    ['an empty list', []],
    ['no data', null],
  ])('throws NotFoundError for %s (an update or delete that matched nothing)', (_label, rows) => {
    expect(() => requireRows(rows)).toThrow(NotFoundError)
  })

  it('is shown as "Este item já não existe."', () => {
    let message = ''
    try {
      requireRows([])
    } catch (error) {
      message = getErrorMessage(error)
    }
    expect(message).toBe('Este item já não existe.')
  })
})

describe('getErrorMessage', () => {
  it('shows a validation message as it is', () => {
    expect(getErrorMessage(new ValidationError('Escreve um nome.'))).toBe('Escreve um nome.')
  })

  it('reports a missing routine', () => {
    expect(getErrorMessage(new RoutineNotFoundError())).toBe('Rotina não encontrada.')
  })

  it('reports a duplicate exercise when creating and when renaming', () => {
    expect(getErrorMessage(new DuplicateExerciseError('create'))).toBe('Já existe um exercício com esse nome.')
    expect(getErrorMessage(new DuplicateExerciseError('rename'))).toBe(
      'Já existe um exercício com esse nome. Se estiver arquivado, reativa-o em Arquivados.',
    )
  })

  it('reports an exercise that is already in the routine', () => {
    expect(getErrorMessage(new AlreadyInRoutineError())).toBe('Este exercício já está na rotina.')
  })

  it.each([
    ['Chrome', 'TypeError: Failed to fetch'],
    ['Safari', 'TypeError: Load failed'],
    ['Firefox', 'NetworkError when attempting to fetch resource.'],
  ])('recognises a network failure (%s)', (_browser, message) => {
    expect(getErrorMessage({ message, code: '' })).toBe('Sem ligação. Tenta outra vez quando voltares a estar online.')
  })

  it('recognises an Auth network failure', () => {
    const error = new Error('fetch failed')
    error.name = 'AuthRetryableFetchError'
    expect(getErrorMessage(error)).toBe('Sem ligação. Tenta outra vez quando voltares a estar online.')
  })

  it.each([
    ['23505', 'Isso já existe.'],
    ['23514', 'Há um valor fora dos limites.'],
    ['23503', 'Este item já não existe.'],
    ['42501', 'Não tens permissão para fazer isto.'],
  ])('turns Postgres code %s into a short message', (code, expected) => {
    expect(getErrorMessage({ code, message: 'from Postgres' })).toBe(expected)
  })

  it('uses a specific message for a unique violation when given', () => {
    expect(getErrorMessage({ code: '23505', message: '' }, { duplicate: 'Este exercício já está na rotina.' })).toBe(
      'Este exercício já está na rotina.',
    )
  })

  it.each([
    ['another code', { code: '22P02', message: 'invalid input' }],
    ['a plain error', new Error('boom')],
    ['not an error at all', 'oops'],
    ['nothing', undefined],
  ])('falls back to a generic message for %s', (_label, error) => {
    expect(getErrorMessage(error)).toBe('Algo correu mal. Tenta outra vez.')
  })
})
