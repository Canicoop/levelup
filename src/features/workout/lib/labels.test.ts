import { describe, expect, it } from 'vitest'
import { formatExerciseCount } from '@/features/workout/lib/labels'

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
