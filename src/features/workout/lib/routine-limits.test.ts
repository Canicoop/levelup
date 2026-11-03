import { describe, expect, it } from 'vitest'
import { MAX_ROUTINE_EXERCISES, ROUTINE_FULL_MESSAGE, isRoutineFull } from '@/features/workout/lib/routine-limits'

describe('isRoutineFull', () => {
  it('matches the 30-exercise limit of submit_workout', () => {
    expect(MAX_ROUTINE_EXERCISES).toBe(30)
  })

  it.each([
    [0, false],
    [29, false],
    [30, true],
    [31, true],
  ])('with %i exercises returns %s', (count, full) => {
    expect(isRoutineFull(count)).toBe(full)
  })

  it('explains the limit in European Portuguese', () => {
    expect(ROUTINE_FULL_MESSAGE).toBe('Uma rotina pode ter até 30 exercícios.')
  })
})
