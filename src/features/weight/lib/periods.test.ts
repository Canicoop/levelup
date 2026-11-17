import { describe, expect, it } from 'vitest'
import type { WeightEntry } from '@/features/weight/lib/entries'
import { entriesInPeriod, periodStart, periodSummary } from '@/features/weight/lib/periods'

const entry = (day: string, tenths: number): WeightEntry => ({ id: day, day, tenths })
const today = '2026-11-17'

describe('periodStart', () => {
  const entries = [entry('2024-05-02', 820), entry('2026-11-17', 784)]

  it('is the same day one, three or twelve months ago', () => {
    expect(periodStart('1M', today, entries)).toBe('2026-10-17')
    expect(periodStart('3M', today, entries)).toBe('2026-08-17')
    expect(periodStart('1A', today, entries)).toBe('2025-11-17')
  })

  it('is the first entry for "Tudo", or null without entries', () => {
    expect(periodStart('all', today, entries)).toBe('2024-05-02')
    expect(periodStart('all', today, [])).toBeNull()
  })
})

describe('entriesInPeriod', () => {
  it('keeps the entries from the start to today, oldest first, the start included', () => {
    const entries = [entry('2026-11-17', 784), entry('2026-10-16', 795), entry('2026-10-17', 790)]
    expect(entriesInPeriod(entries, '1M', today).map((e) => e.day)).toEqual(['2026-10-17', '2026-11-17'])
  })
})

describe('periodSummary', () => {
  it('is empty without entries', () => {
    expect(periodSummary([], '1M', today)).toEqual({ current: null, difference: null, since: null })
  })

  it('has no difference with a single entry', () => {
    expect(periodSummary([entry(today, 784)], '1M', today)).toEqual({
      current: entry(today, 784),
      difference: null,
      since: null,
    })
  })

  it('compares with the first entry inside the period, not with the period\'s first day', () => {
    const entries = [entry('2026-09-30', 800), entry('2026-10-20', 789), entry('2026-11-10', 786), entry(today, 784)]
    expect(periodSummary(entries, '1M', today)).toEqual({
      current: entry(today, 784),
      difference: -5,
      since: '2026-10-20',
    })
  })

  it('shows the current weight without a difference when it is older than the period', () => {
    const entries = [entry('2026-08-01', 800), entry('2026-09-10', 790)]
    expect(periodSummary(entries, '1M', today)).toEqual({
      current: entry('2026-09-10', 790),
      difference: null,
      since: null,
    })
  })

  it('compares with the very first entry for "Tudo"', () => {
    const entries = [entry('2024-05-02', 820), entry('2026-10-20', 789), entry(today, 784)]
    expect(periodSummary(entries, 'all', today)).toEqual({
      current: entry(today, 784),
      difference: -36,
      since: '2024-05-02',
    })
  })
})
