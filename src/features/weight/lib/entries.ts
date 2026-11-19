import { toTenths, type Tenths } from '@/features/weight/lib/weight-values'
import { lisbonToday, type DayKey } from '@/lib/lisbon-day'

export type WeightEntry = { id: string; day: DayKey; tenths: Tenths }

export function toWeightEntry(row: { id: string; entry_date: string; weight_kg: number }): WeightEntry {
  return { id: row.id, day: row.entry_date, tenths: toTenths(row.weight_kg) }
}

// Day keys sort as text. There is at most one entry per day.
export function newestFirst(entries: WeightEntry[]) {
  return [...entries].sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0))
}

export function oldestFirst(entries: WeightEntry[]) {
  return newestFirst(entries).reverse()
}

// The history, newest first, each entry with its difference from the one
// before it (the next older entry, however many days earlier); none for the first.
export function historyRows(entries: WeightEntry[]): { entry: WeightEntry; difference: Tenths | null }[] {
  const sorted = newestFirst(entries)
  return sorted.map((entry, index) => {
    const previous = sorted[index + 1]
    return { entry, difference: previous ? entry.tenths - previous.tenths : null }
  })
}

export function todayEntry(entries: WeightEntry[], today: DayKey) {
  return entries.find((entry) => entry.day === today) ?? null
}

// Only today's entry can be edited; the database enforces it too.
export function canEdit(entry: WeightEntry, today: DayKey) {
  return entry.day === today
}

// True when Lisbon's day changed since the sheet opened on `openedOn`: saving
// then would put a value meant for that day on the new one, so it is refused.
export function dayChanged(openedOn: DayKey, now: Date) {
  return lisbonToday(now) !== openedOn
}
