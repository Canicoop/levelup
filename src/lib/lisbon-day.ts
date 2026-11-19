// Lisbon's calendar days, as "2026-11-17", shared by the modules whose days are
// Lisbon's (see docs/decisions.md, Weight module): the database sets their
// dates to Lisbon's day, and the app must agree with it even on a phone in
// another time zone. Unlike the Workout module, which uses the device's local day.
//
// Arithmetic is done on the text through UTC (Date.UTC), never on local Date
// objects, so a clock change never makes a day longer or shorter and the
// device's time zone never matters.

export type DayKey = string

const lisbonDayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Lisbon',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const DAY_MS = 86_400_000

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function parts(day: DayKey) {
  const [year, month, date] = day.split('-').map(Number)
  return { year, month, date }
}

function fromUTC(time: number): DayKey {
  const date = new Date(time)
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

// Lisbon's calendar day at this instant. Built from the parts, so it does not
// depend on how a locale orders them.
export function lisbonToday(now: Date): DayKey {
  const values = lisbonDayFormat.formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) => values.find((value) => value.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

// Midnight UTC of the day, in milliseconds: a position on the chart's time axis
// and the base of the arithmetic below. Not the instant the day starts in Lisbon.
export function dayTime(day: DayKey) {
  const { year, month, date } = parts(day)
  return Date.UTC(year, month - 1, date)
}

export function shiftDays(day: DayKey, days: number): DayKey {
  const { year, month, date } = parts(day)
  return fromUTC(Date.UTC(year, month - 1, date + days))
}

// `to` minus `from`, in calendar days.
export function daysBetween(from: DayKey, to: DayKey) {
  return Math.round((dayTime(to) - dayTime(from)) / DAY_MS)
}

// The same day of another month, or that month's last day when it is shorter
// (31 March minus one month is 28 February).
export function shiftMonths(day: DayKey, months: number): DayKey {
  const { year, month, date } = parts(day)
  const lastDate = new Date(Date.UTC(year, month - 1 + months + 1, 0)).getUTCDate()
  return fromUTC(Date.UTC(year, month - 1 + months, Math.min(date, lastDate)))
}
