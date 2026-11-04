import { describe, expect, it } from 'vitest'
import {
  formatDiscardWarning,
  formatExerciseCount,
  formatLastSets,
  formatLoggedSets,
} from '@/features/workout/lib/labels'

describe('formatExerciseCount', () => {
  it.each([
    [0, 'Sem exercícios'],
    [1, '1 exercício'],
    [2, '2 exercícios'],
    [12, '12 exercícios'],
  ])('formats %i as %j', (count, expected) => {
    expect(formatExerciseCount(count)).toBe(expected)
  })
})

describe('formatLastSets', () => {
  it('lists the sets, with the weight in European Portuguese', () => {
    expect(
      formatLastSets([
        { weightKg: 40, reps: 12 },
        { weightKg: 22.5, reps: 10 },
        { weightKg: 35, reps: 11 },
      ]),
    ).toBe('Última vez: 40 × 12 · 22,5 × 10 · 35 × 11')
  })

  it('shows a single set without a separator', () => {
    expect(formatLastSets([{ weightKg: 100, reps: 5 }])).toBe('Última vez: 100 × 5')
  })

  it('says "Primeira vez" with no history', () => {
    expect(formatLastSets([])).toBe('Primeira vez')
  })
})

describe('formatLoggedSets', () => {
  it.each([
    [0, 'Nenhuma série registada'],
    [1, '1 série registada'],
    [7, '7 séries registadas'],
  ])('formats %i as %j', (count, expected) => {
    expect(formatLoggedSets(count)).toBe(expected)
  })
})

describe('formatDiscardWarning', () => {
  it.each([
    [1, 'A série registada perde-se.'],
    [7, 'As 7 séries registadas perdem-se.'],
  ])('formats %i as %j', (count, expected) => {
    expect(formatDiscardWarning(count)).toBe(expected)
  })
})
