import { historyRows, type WeightEntry } from '@/features/weight/lib/entries'
import type { Period } from '@/features/weight/lib/periods'
import { formatDifference, formatWeight, type Tenths } from '@/features/weight/lib/weight-values'
import { dayTime, daysBetween, type DayKey } from '@/lib/lisbon-day'

// Days are formatted from midnight UTC in the UTC zone (see dayTime), so the
// device's time zone never shifts the name of a day.
const weekdayFormat = new Intl.DateTimeFormat('pt-PT', { timeZone: 'UTC', weekday: 'long' })
const dayMonthFormat = new Intl.DateTimeFormat('pt-PT', { timeZone: 'UTC', day: 'numeric', month: 'long' })
const dayMonthYearFormat = new Intl.DateTimeFormat('pt-PT', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

// "3 de novembro", or "3 de novembro de 2025" in another year. Always the
// date, for the sheet of an older entry and its delete question.
export function formatEntryDate(day: DayKey, today: DayKey) {
  const format = day.slice(0, 4) === today.slice(0, 4) ? dayMonthFormat : dayMonthYearFormat
  return format.format(dayTime(day))
}

const shortMonthFormat = new Intl.DateTimeFormat('pt-PT', { timeZone: 'UTC', month: 'short' })
const longDayFormat = new Intl.DateTimeFormat('pt-PT', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const longDayYearFormat = new Intl.DateTimeFormat('pt-PT', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

// Spans up to this many days label the time axis by day; longer ones by month.
const AXIS_DAY_SPAN = 120

// A time-axis label: "17 nov" over a short span, "nov 2026" over a long one
// (1A, Tudo), where the months of two years would otherwise look alike.
// pt-PT's short date is "17/11", so the label is built from the month's short
// name without its dot.
export function formatAxisDay(day: DayKey, spanDays: number) {
  const month = shortMonthFormat.format(dayTime(day)).replace('.', '')
  return spanDays <= AXIS_DAY_SPAN ? `${Number(day.slice(8, 10))} ${month}` : `${month} ${day.slice(0, 4)}`
}

// The day at the top of the chart's touch card: "terça-feira, 17 de
// novembro", with the year when it is another.
export function formatChartDay(day: DayKey, today: DayKey) {
  const format = day.slice(0, 4) === today.slice(0, 4) ? longDayFormat : longDayYearFormat
  return format.format(dayTime(day))
}

const PERIOD_PHRASES: Record<Period, string> = {
  '1M': 'No último mês',
  '3M': 'Nos últimos 3 meses',
  '1A': 'No último ano',
  all: 'Desde o primeiro registo',
}

// The chart's description for screen readers, from the period's entries
// (oldest first): "No último mês, o peso foi de 79,6 kg a 78,4 kg."
export function formatChartDescription(period: Period, entries: WeightEntry[]) {
  const phrase = PERIOD_PHRASES[period]
  const first = entries[0]
  const last = entries[entries.length - 1]
  if (!first || !last) return 'Sem registos neste período.'
  if (first === last) return `${phrase}, há um registo: ${formatWeight(first.tenths)}.`
  return `${phrase}, o peso foi de ${formatWeight(first.tenths)} a ${formatWeight(last.tenths)}.`
}

// "hoje", "ontem", the weekday up to six days ago ("terça-feira"), then the
// date. A day after today (a clock that went back) shows as a date.
export function formatEntryDay(day: DayKey, today: DayKey) {
  const ago = daysBetween(day, today)
  if (ago === 0) return 'hoje'
  if (ago === 1) return 'ontem'
  if (ago > 1 && ago < 7) return weekdayFormat.format(dayTime(day))
  return formatEntryDate(day, today)
}

// A history row's day, capitalised: "Hoje", "Ontem", "Domingo", "10 de novembro".
export function formatHistoryDay(day: DayKey, today: DayKey) {
  const text = formatEntryDay(day, today)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// The line under the current weight: "hoje · −0,5 kg desde 20 de outubro",
// or only the day when there is no difference.
export function formatSummaryLine(day: DayKey, difference: Tenths | null, since: DayKey | null, today: DayKey) {
  const when = formatEntryDay(day, today)
  if (difference === null || since === null) return when
  return `${when} · ${formatDifference(difference)} desde ${formatEntryDay(since, today)}`
}

// Always the date, never a weekday, which could be read as another week.
export function formatDeleteQuestion(day: DayKey, today: DayKey) {
  return `Apagar o registo de ${day === today ? 'hoje' : formatEntryDate(day, today)}?`
}

// Home's Weight card: the latest entry, its day, and its difference from the
// entry before it. Null without entries.
export function homeWeightSummary(entries: WeightEntry[], today: DayKey) {
  const [latest] = historyRows(entries)
  if (!latest) return null
  return {
    weight: formatWeight(latest.entry.tenths),
    day: formatEntryDay(latest.entry.day, today),
    difference: latest.difference === null ? null : formatDifference(latest.difference),
    loggedToday: latest.entry.day === today,
  }
}
