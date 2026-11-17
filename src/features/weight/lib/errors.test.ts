import { describe, expect, it } from 'vitest'
import { DayChangedError, weightErrorMessage } from '@/features/weight/lib/errors'
import { NotFoundError } from '@/features/workout/lib/errors'

describe('weightErrorMessage', () => {
  it('asks to log today\'s weight when the day changed', () => {
    expect(weightErrorMessage(new DayChangedError())).toBe('O dia mudou. Regista o peso de hoje.')
  })

  it('says the entry no longer exists', () => {
    expect(weightErrorMessage(new NotFoundError())).toBe('Este registo já não existe.')
  })

  it('reports a network failure', () => {
    expect(weightErrorMessage(new TypeError('Failed to fetch'))).toBe(
      'Sem ligação. Tenta outra vez quando voltares a estar online.',
    )
  })

  it('falls back to the generic messages for database codes', () => {
    expect(weightErrorMessage({ code: '23514', message: 'check' })).toBe('Há um valor fora dos limites.')
    expect(weightErrorMessage({ code: 'XX000', message: 'internal' })).toBe('Algo correu mal. Tenta outra vez.')
  })
})
