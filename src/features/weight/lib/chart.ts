import { oldestFirst, type WeightEntry } from '@/features/weight/lib/entries'
import { entriesInPeriod, type Period } from '@/features/weight/lib/periods'
import { toKg } from '@/features/weight/lib/weight-values'
import { dayTime, daysBetween, shiftDays, type DayKey } from '@/lib/lisbon-day'

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

const DAY_MS = 86_400_000

// The chart's time axis: from the period's first day to today. A span of a
// single day (one entry today, in "Tudo") is widened by three days on each
// side, so the point sits in the middle instead of on an edge.
export function timeDomain(start: DayKey, today: DayKey): [number, number] {
  if (start >= today) return [dayTime(today) - 3 * DAY_MS, dayTime(today) + 3 * DAY_MS]
  return [dayTime(start), dayTime(today)]
}

// Up to `count` days for the time axis, evenly spread from start to end, both
// included, never the same day twice.
export function timeTicks(start: DayKey, end: DayKey, count = 4): DayKey[] {
  const span = daysBetween(start, end)
  if (span <= 0) return [end]
  const steps = Math.min(count - 1, span)
  const days = Array.from({ length: steps + 1 }, (_, index) => shiftDays(start, Math.round((span * index) / steps)))
  return [...new Set(days)]
}

// The weight range to show, in whole kg: the whole kg just around the lowest
// and highest values in the points (daily and average), so 78,2 to 80,0 gives
// 78 to 80. A single whole value (78,0) gets a kg on each side. It never
// starts at zero: what matters in a weight is its change.
export function weightDomain(points: ChartPoint[]): [number, number] | null {
  const values = points.flatMap((point) => [point.weight, point.average]).filter((value) => value !== null)
  if (values.length === 0) return null
  const low = Math.floor(Math.min(...values))
  const high = Math.ceil(Math.max(...values))
  return low === high ? [low - 1, high + 1] : [low, high]
}

const TICK_STEPS = [1, 2, 5, 10, 20, 50]
const MAX_WEIGHT_TICKS = 5

// Whole-kg ticks for the weight axis: the smallest round step (1, 2, 5, 10…)
// that covers the range in at most five ticks, aligned to multiples of the
// step. The axis runs from the first tick to the last, so it never adds more
// room than one step needs.
export function weightTicks([low, high]: [number, number]): number[] {
  for (const step of TICK_STEPS) {
    const first = Math.floor(low / step) * step
    const last = Math.ceil(high / step) * step
    const count = (last - first) / step + 1
    if (count <= MAX_WEIGHT_TICKS) return Array.from({ length: count }, (_, index) => first + index * step)
  }
  return [low, high]
}

// Above this many daily points the dots would merge into a thick line, so only
// the line is drawn.
export const MAX_DOTS = 120

// The indices of the daily values that get a dot: every one up to MAX_DOTS
// points, and above that only an isolated one (no daily value on either side),
// which would otherwise not show at all, since a line needs two points.
// Worked out once per series, in one pass, since the chart asks for every
// point (asking per point, with a count each time, was quadratic).
export function dailyDots(points: ChartPoint[]): Set<number> {
  const daily = points.filter((point) => point.weight !== null).length
  const dots = new Set<number>()
  points.forEach((point, index) => {
    if (point.weight === null) return
    const isolated = points[index - 1]?.weight == null && points[index + 1]?.weight == null
    if (daily <= MAX_DOTS || isolated) dots.add(index)
  })
  return dots
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
