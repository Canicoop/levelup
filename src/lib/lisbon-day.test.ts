import { describe, expect, it } from 'vitest'
import { dayTime, daysBetween, lisbonToday, shiftDays, shiftMonths } from '@/lib/lisbon-day'

describe('lisbonToday', () => {
  it('is a day ahead of UTC from 23:00 UTC in summer (UTC+1)', () => {
    expect(lisbonToday(new Date('2026-07-01T22:59:59Z'))).toBe('2026-07-01')
    expect(lisbonToday(new Date('2026-07-01T23:00:00Z'))).toBe('2026-07-02')
  })

  it('follows UTC in winter (UTC+0)', () => {
    expect(lisbonToday(new Date('2026-12-31T23:30:00Z'))).toBe('2026-12-31')
    expect(lisbonToday(new Date('2027-01-01T00:00:00Z'))).toBe('2027-01-01')
  })

  it('is right around the change to summer time (29 March 2026)', () => {
    expect(lisbonToday(new Date('2026-03-28T23:59:00Z'))).toBe('2026-03-28')
    expect(lisbonToday(new Date('2026-03-29T01:00:00Z'))).toBe('2026-03-29')
  })

  it('is right around the change to winter time (25 October 2026)', () => {
    expect(lisbonToday(new Date('2026-10-24T22:59:00Z'))).toBe('2026-10-24')
    expect(lisbonToday(new Date('2026-10-24T23:00:00Z'))).toBe('2026-10-25')
  })
})

describe('dayTime', () => {
  it('is midnight UTC of the day', () => {
    expect(dayTime('2026-11-17')).toBe(Date.UTC(2026, 10, 17))
  })
})

describe('shiftDays', () => {
  it('moves by calendar days across a clock change', () => {
    expect(shiftDays('2026-03-28', 1)).toBe('2026-03-29')
    expect(shiftDays('2026-10-25', 1)).toBe('2026-10-26')
  })

  it('crosses months, years and leap days', () => {
    expect(shiftDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('moves back with a negative number', () => {
    expect(shiftDays('2026-11-01', -1)).toBe('2026-10-31')
    expect(shiftDays('2026-11-17', -6)).toBe('2026-11-11')
  })
})

describe('daysBetween', () => {
  it('is 0 for the same day', () => {
    expect(daysBetween('2026-11-17', '2026-11-17')).toBe(0)
  })

  it('counts calendar days across a clock change and a new year', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2)
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3)
  })

  it('is negative when `to` comes first', () => {
    expect(daysBetween('2026-11-17', '2026-11-10')).toBe(-7)
  })
})

describe('shiftMonths', () => {
  it('keeps the day of the month', () => {
    expect(shiftMonths('2026-11-17', -1)).toBe('2026-10-17')
    expect(shiftMonths('2026-01-15', -3)).toBe('2025-10-15')
  })

  it('stops at the last day of a shorter month', () => {
    expect(shiftMonths('2026-03-31', -1)).toBe('2026-02-28')
    expect(shiftMonths('2028-03-31', -1)).toBe('2028-02-29')
    expect(shiftMonths('2028-02-29', -12)).toBe('2027-02-28')
  })
})
