import { describe, expect, it } from 'vitest'
import { formatLongDate, toISODate } from '@/lib/format'

// The time zone is fixed in vite.config.ts (test.env.TZ). If it did not take
// effect, the date tests below would depend on the machine they run on.
it('runs in the Europe/Lisbon time zone', () => {
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('Europe/Lisbon')
})

describe('toISODate', () => {
  it('returns the local date as YYYY-MM-DD', () => {
    expect(toISODate(new Date(2026, 9, 29, 23, 30))).toBe('2026-10-29')
    expect(toISODate(new Date(2027, 0, 1, 0, 0))).toBe('2027-01-01')
  })

  it('keeps the local day where toISOString would give the UTC one', () => {
    // 1 July 00:30 in Lisbon is 30 June 23:30 UTC (summer time, UTC+1).
    const justAfterMidnight = new Date(2026, 6, 1, 0, 30)
    expect(justAfterMidnight.toISOString().slice(0, 10)).toBe('2026-06-30')
    expect(toISODate(justAfterMidnight)).toBe('2026-07-01')
  })
})

describe('formatLongDate', () => {
  it('formats the weekday, day and month in European Portuguese', () => {
    expect(formatLongDate(new Date(2026, 9, 29))).toBe('quinta-feira, 29 de outubro')
    expect(formatLongDate(new Date(2027, 0, 1))).toBe('sexta-feira, 1 de janeiro')
  })
})
