import { describe, expect, it } from 'vitest'
import {
  currentMonth,
  followCurrentMonth,
  isFutureMonth,
  monthOfDay,
  monthReadRange,
  monthStart,
  nextMonthStart,
  shiftMonth,
} from '@/features/finance/lib/months'

describe('currentMonth', () => {
  it("is Lisbon's month around the change to summer time (UTC+1 from 29 March 2026)", () => {
    expect(currentMonth(new Date('2026-03-31T22:59:00Z'))).toBe('2026-03')
    // 00:30 on 1 April in Lisbon.
    expect(currentMonth(new Date('2026-03-31T23:30:00Z'))).toBe('2026-04')
  })

  it('starts a month at 23:00 UTC in summer', () => {
    expect(currentMonth(new Date('2026-09-30T22:59:59Z'))).toBe('2026-09')
    expect(currentMonth(new Date('2026-09-30T23:00:00Z'))).toBe('2026-10')
  })

  it('follows UTC in winter (UTC+0 from 25 October 2026)', () => {
    expect(currentMonth(new Date('2026-10-31T23:30:00Z'))).toBe('2026-10')
    expect(currentMonth(new Date('2026-11-01T00:00:00Z'))).toBe('2026-11')
  })

  it('crosses the new year', () => {
    expect(currentMonth(new Date('2026-12-31T23:59:59Z'))).toBe('2026-12')
    expect(currentMonth(new Date('2027-01-01T00:00:00Z'))).toBe('2027-01')
  })
})

describe('monthOfDay', () => {
  it.each([
    ['2026-11-19', '2026-11'],
    ['2026-11-01', '2026-11'],
    ['2028-02-29', '2028-02'],
  ])('puts %j in %j', (day, month) => {
    expect(monthOfDay(day)).toBe(month)
  })
})

describe('monthStart and nextMonthStart', () => {
  it('are the first day of the month and of the next one', () => {
    expect(monthStart('2026-11')).toBe('2026-11-01')
    expect(nextMonthStart('2026-11')).toBe('2026-12-01')
  })

  it('cross the new year', () => {
    expect(nextMonthStart('2026-12')).toBe('2027-01-01')
  })
})

describe('monthReadRange', () => {
  const inRange = (day: string, range: { from: string; to: string }) => day >= range.from && day < range.to

  it('covers every day of a February in a leap year, and nothing of March', () => {
    const range = monthReadRange('2028-02')
    expect(range).toEqual({ from: '2028-02-01', to: '2028-03-01' })
    expect(inRange('2028-02-29', range)).toBe(true)
    expect(inRange('2028-03-01', range)).toBe(false)
    expect(inRange('2028-01-31', range)).toBe(false)
  })

  it('covers every day of a February in a common year', () => {
    const range = monthReadRange('2026-02')
    expect(range).toEqual({ from: '2026-02-01', to: '2026-03-01' })
    expect(inRange('2026-02-28', range)).toBe(true)
    expect(inRange('2026-03-01', range)).toBe(false)
  })

  it("ends December at the next year's first day", () => {
    expect(monthReadRange('2026-12')).toEqual({ from: '2026-12-01', to: '2027-01-01' })
  })
})

describe('shiftMonth', () => {
  it.each([
    ['2026-11', -1, '2026-10'],
    ['2026-01', -1, '2025-12'],
    ['2026-12', 1, '2027-01'],
    ['2026-11', -12, '2025-11'],
    ['2026-11', 12, '2027-11'],
    ['2026-03', -27, '2023-12'],
    ['2026-11', 0, '2026-11'],
  ])('moves %j by %i to %j', (month, months, expected) => {
    expect(shiftMonth(month, months)).toBe(expected)
  })
})

describe('followCurrentMonth', () => {
  it('moves a page on the month that was current to the new one', () => {
    expect(followCurrentMonth('2026-11', '2026-11', '2026-12')).toBe('2026-12')
  })

  it('leaves a page the user moved to another month where it is', () => {
    expect(followCurrentMonth('2026-09', '2026-11', '2026-12')).toBe('2026-09')
  })
})

describe('isFutureMonth', () => {
  it.each([
    ['2026-11', '2026-11', false],
    ['2026-10', '2026-11', false],
    ['2026-12', '2026-11', true],
    ['2027-01', '2026-12', true],
    ['2025-12', '2026-01', false],
  ])('%j after %j is %s', (month, current, expected) => {
    expect(isFutureMonth(month, current)).toBe(expected)
  })
})
