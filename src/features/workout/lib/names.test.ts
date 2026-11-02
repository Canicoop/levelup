import { describe, expect, it } from 'vitest'
import { cleanName, validateExerciseName, validateRoutineName } from '@/features/workout/lib/names'

describe('cleanName', () => {
  it.each([
    ['  Supino  ', 'Supino'],
    ['Supino   inclinado', 'Supino inclinado'],
    ['\tSupino\n inclinado ', 'Supino inclinado'],
    ['', ''],
    ['   ', ''],
  ])('cleans %j to %j', (raw, expected) => {
    expect(cleanName(raw)).toBe(expected)
  })
})

describe('validateExerciseName', () => {
  it('accepts names from 1 to 80 characters', () => {
    expect(validateExerciseName('A')).toBeNull()
    expect(validateExerciseName('x'.repeat(80))).toBeNull()
  })

  it('refuses an empty name', () => {
    expect(validateExerciseName('')).toBe('Escreve um nome.')
  })

  it('refuses a name over 80 characters', () => {
    expect(validateExerciseName('x'.repeat(81))).toBe('O nome pode ter até 80 caracteres.')
  })

  it('counts an emoji as one character, like Postgres char_length', () => {
    // Each 💪 is two UTF-16 units, so .length would say 160.
    const eighty = '💪'.repeat(80)
    expect(eighty.length).toBe(160)
    expect(validateExerciseName(eighty)).toBeNull()
    expect(validateExerciseName('💪'.repeat(81))).toBe('O nome pode ter até 80 caracteres.')
  })
})

describe('validateRoutineName', () => {
  it('accepts names from 1 to 60 characters', () => {
    expect(validateRoutineName('A')).toBeNull()
    expect(validateRoutineName('x'.repeat(60))).toBeNull()
  })

  it('refuses an empty name or one over 60 characters', () => {
    expect(validateRoutineName('')).toBe('Escreve um nome.')
    expect(validateRoutineName('x'.repeat(61))).toBe('O nome pode ter até 60 caracteres.')
  })
})
