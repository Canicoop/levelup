import { oldestFirst, type WeightEntry } from '@/features/weight/lib/entries'
import { dayTime, daysBetween, shiftDays, type DayKey } from '@/features/weight/lib/lisbon-day'
import { entriesInPeriod, type Period } from '@/features/weight/lib/periods'
import { toKg } from '@/features/weight/lib/weight-values'

const AVERAGE_WINDOW_DAYS = 7
const AVERAGE_MIN_ENTRIES = 3

// Two entries at most this many days apart are joined by a line; a longer gap
// breaks it (see docs/decisions.md, Weight module).
export const MAX_LINE_GAP_DAYS = 3

// The 7-day moving average, only on days with an entry: the mean of the
// entries in the 7 calendar days ending that day, when there are at least 3 of
// them. In tenths, unrounded; whoever shows it rounds it. Days without an entry
// never get a value.
export function movingAverage(entries: WeightEntry[]): Map<DayKey, number> {
  const sorted = oldestFirst(entries)
  const averages = new Map<DayKey, number>()
  let start = 0
  let sum = 0

  sorted.forEach((entry, index) => {
    sum += entry.tenths
    while (daysBetween(sorted[start].day, entry.day) >= AVERAGE_WINDOW_DAYS) {
      sum -= sorted[start].tenths
      start += 1
    }
    const count = index - start + 1
    if (count >= AVERAGE_MIN_ENTRIES) averages.set(entry.day, sum / count)
  })

  return averages
}

// One point of the chart, in kg. `time` places it on a time axis, so points
// sit at their real dates and days without an entry have no point.
export type ChartPoint = { time: number; day: DayKey; weight: number | null; average: number | null }

// The period's entries as chart points. The average comes from every entry,
// so the first days of the period use the entries just before it. A gap longer
// than MAX_LINE_GAP_DAYS gets a point with no values on the day after the
// earlier entry, which breaks both lines there (Recharts with connectNulls off).
export function chartPoints(entries: WeightEntry[], period: Period, today: DayKey): ChartPoint[] {
  const averages = movingAverage(entries)
  const inPeriod = entriesInPeriod(entries, period, today)
  const points: ChartPoint[] = []

  inPeriod.forEach((entry, index) => {
    const previous = inPeriod[index - 1]
    if (previous && daysBetween(previous.day, entry.day) > MAX_LINE_GAP_DAYS) {
      const gap = shiftDays(previous.day, 1)
      points.push({ time: dayTime(gap), day: gap, weight: null, average: null })
    }
    const average = averages.get(entry.day)
    points.push({
      time: dayTime(entry.day),
      day: entry.day,
      weight: toKg(entry.tenths),
      average: average === undefined ? null : average / 10,
    })
  })

  return points
}
