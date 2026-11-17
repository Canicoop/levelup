import { historyRows, type WeightEntry } from '@/features/weight/lib/entries'
import { dayTime, daysBetween, type DayKey } from '@/features/weight/lib/lisbon-day'
import { formatDifference, formatWeight, type Tenths } from '@/features/weight/lib/weight-values'

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
