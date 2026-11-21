import { lisbonToday, type DayKey } from '@/lib/lisbon-day'

// The Finance module's months are Lisbon's, as "2026-11" (see docs/decisions.md,
// Finance module), like its days and the database's starts_on. Arithmetic is
// done on the year and month numbers, never on Date objects, so neither a
// clock change nor the device's time zone matters.

export type MonthKey = string

function parts(month: MonthKey) {
  const [year, number] = month.split('-').map(Number)
  return { year, number }
}

function toKey(year: number, number: number): MonthKey {
  return `${String(year).padStart(4, '0')}-${String(number).padStart(2, '0')}`
}

// Lisbon's month at this instant.
export function currentMonth(now: Date): MonthKey {
  return monthOfDay(lisbonToday(now))
}

// The month a day ("2026-11-19") or a budget's starts_on belongs to.
export function monthOfDay(day: DayKey): MonthKey {
  return day.slice(0, 7)
}

// The month's first day, as the database's starts_on.
export function monthStart(month: MonthKey): DayKey {
  return `${month}-01`
}

// Another month: -1 is the month before.
export function shiftMonth(month: MonthKey, months: number): MonthKey {
  const { year, number } = parts(month)
  const index = year * 12 + (number - 1) + months
  return toKey(Math.floor(index / 12), (index % 12) + 1)
}

// The next month's first day: the end of a month's read, exclusive.
export function nextMonthStart(month: MonthKey): DayKey {
  return monthStart(shiftMonth(month, 1))
}

// A month's transactions are read with occurred_on >= from and < to.
export function monthReadRange(month: MonthKey): { from: DayKey; to: DayKey } {
  return { from: monthStart(month), to: nextMonthStart(month) }
}

// The month the page shows once the current month changes from `was` to `now`
// (a new month while the app stayed open, seen when useNow ticks or the app
// comes back to the foreground): a page on the month that was current follows
// to the new one; one the user moved to another month stays there. As Home's
// calendar (see followCurrentMonth in the Workout module).
export function followCurrentMonth(shown: MonthKey, was: MonthKey, now: MonthKey): MonthKey {
  return shown === was ? now : shown
}

// Whether a month comes after the current one: the page never shows it. "YYYY-MM"
// keys sort as text in calendar order.
export function isFutureMonth(month: MonthKey, current: MonthKey) {
  return month > current
}
