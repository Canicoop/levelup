import { describe, expect, it } from 'vitest'
import { getGreeting } from '@/features/home/lib/greeting'

// Dates are built from local hours and minutes, so the result does not depend
// on the time zone.
function at(hours: number, minutes: number) {
  return new Date(2026, 9, 29, hours, minutes)
}

describe('getGreeting', () => {
  it.each([
    [0, 0, 'Boa noite'],
    [5, 59, 'Boa noite'],
    [6, 0, 'Bom dia'],
    [11, 59, 'Bom dia'],
    [12, 0, 'Boa tarde'],
    [19, 59, 'Boa tarde'],
    [20, 0, 'Boa noite'],
    [23, 59, 'Boa noite'],
  ])('at %i:%i says %s', (hours, minutes, expected) => {
    expect(getGreeting(at(hours, minutes))).toBe(expected)
  })
})
