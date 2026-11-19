import { newestFirst, oldestFirst, type WeightEntry } from '@/features/weight/lib/entries'
import type { Tenths } from '@/features/weight/lib/weight-values'
import { shiftMonths, type DayKey } from '@/lib/lisbon-day'

// The chart's filter: 1M, 3M, 1A, Tudo.
export type Period = '1M' | '3M' | '1A' | 'all'

const PERIOD_MONTHS = { '1M': 1, '3M': 3, '1A': 12 } as const

// The first day of the period: the same day one, three or twelve months ago,
// inclusive, or the first entry's day for "Tudo" (null without entries).
export function periodStart(period: Period, today: DayKey, entries: WeightEntry[]): DayKey | null {
  if (period === 'all') return oldestFirst(entries)[0]?.day ?? null
  return shiftMonths(today, -PERIOD_MONTHS[period])
}

// The period's entries, oldest first, up to today.
export function entriesInPeriod(entries: WeightEntry[], period: Period, today: DayKey) {
  const start = periodStart(period, today, entries)
  if (start === null) return []
  return oldestFirst(entries).filter((entry) => entry.day >= start && entry.day <= today)
}

// The summary at the top: the current weight (the most recent entry, even
// before the period), and its difference from the period's first entry. No
// difference when the current entry is not in the period or is its only one.
export function periodSummary(
  entries: WeightEntry[],
  period: Period,
  today: DayKey,
): { current: WeightEntry | null; difference: Tenths | null; since: DayKey | null } {
  const current = newestFirst(entries)[0] ?? null
  const inPeriod = entriesInPeriod(entries, period, today)
  const first = inPeriod[0]
  const last = inPeriod[inPeriod.length - 1]

  if (!current || inPeriod.length < 2 || last.id !== current.id) {
    return { current, difference: null, since: null }
  }
  return { current, difference: current.tenths - first.tenths, since: first.day }
}
