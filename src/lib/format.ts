const longDateFormat = new Intl.DateTimeFormat('pt-PT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

// "quinta-feira, 29 de outubro"
export function formatLongDate(date: Date) {
  return longDateFormat.format(date)
}

const monthFormat = new Intl.DateTimeFormat('pt-PT', { month: 'long' })

// "novembro": the month's name, in lower case as European Portuguese writes it.
// Capitalised where it is a title ("Novembro").
export function formatMonth(date: Date) {
  return monthFormat.format(date)
}

// "2026-10-29" in local time, for <time dateTime>. toISOString() would use
// UTC and show the wrong day late at night.
export function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
