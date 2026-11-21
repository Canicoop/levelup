import type { Kind } from '@/features/finance/lib/categories'
import { formatEuros } from '@/features/finance/lib/money'
import { monthStart, type MonthKey } from '@/features/finance/lib/months'
import type { Transaction } from '@/features/finance/lib/totals'
import { dayTime, daysBetween, type DayKey } from '@/lib/lisbon-day'

// "Despesa" or "Receita": the segmented control, an archived category's row
// ("Casa · Despesa") and screen-reader labels.
export function kindLabel(kind: Kind) {
  return kind === 'expense' ? 'Despesa' : 'Receita'
}

// Days and months are Lisbon's (see src/lib/lisbon-day.ts), formatted from
// midnight UTC in the UTC zone, so the device's time zone never shifts a name.
const monthNameFormat = new Intl.DateTimeFormat('pt-PT', { timeZone: 'UTC', month: 'long' })
const weekdayFormat = new Intl.DateTimeFormat('pt-PT', { timeZone: 'UTC', weekday: 'long' })
const dayMonthFormat = new Intl.DateTimeFormat('pt-PT', { timeZone: 'UTC', day: 'numeric', month: 'long' })
const dayMonthYearFormat = new Intl.DateTimeFormat('pt-PT', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// "novembro": the month's name in lower case, as European Portuguese writes it
// inside a sentence.
function monthName(month: MonthKey) {
  return monthNameFormat.format(dayTime(monthStart(month)))
}

// The month card's title: "Novembro 2026", without "de", as Home's calendar.
export function formatMonthTitle(month: MonthKey) {
  return `${capitalize(monthName(month))} ${month.slice(0, 4)}`
}

// A day's heading in the list: "Hoje", "Ontem", the weekday up to six days ago
// ("Quarta-feira"), then the date ("10 de novembro", with the year when it is
// another). `today` is Lisbon's (lisbonToday), as in the Weight module.
export function formatTransactionDay(day: DayKey, today: DayKey) {
  const ago = daysBetween(day, today)
  if (ago === 0) return 'Hoje'
  if (ago === 1) return 'Ontem'
  if (ago > 1 && ago < 7) return capitalize(weekdayFormat.format(dayTime(day)))
  const format = day.slice(0, 4) === today.slice(0, 4) ? dayMonthFormat : dayMonthYearFormat
  return format.format(dayTime(day))
}

// The list's days, in the order given (sortTransactions: the newest first),
// each with its transactions in that same order.
export function groupByDay(transactions: Transaction[]): { day: DayKey; transactions: Transaction[] }[] {
  const groups: { day: DayKey; transactions: Transaction[] }[] = []
  for (const transaction of transactions) {
    const last = groups[groups.length - 1]
    if (last && last.day === transaction.day) last.transactions.push(transaction)
    else groups.push({ day: transaction.day, transactions: [transaction] })
  }
  return groups
}

// A transaction's amount with its direction: a minus sign (U+2212) before an
// expense's "12,50 €", and "+1500,00 €" for income. The same colour either way:
// red and green are kept for errors and confirmations.
export function formatSignedAmount(transaction: Pick<Transaction, 'kind' | 'cents'>) {
  return `${transaction.kind === 'income' ? '+' : '\u2212'}${formatEuros(transaction.cents)}`
}

// A month with no transactions: "Sem movimentos em novembro.", and in the
// current month a hint to log the first one.
export function formatEmptyMonth(month: MonthKey, current: MonthKey): { title: string; hint: string | null } {
  return {
    title: `Sem movimentos em ${monthName(month)}.`,
    hint: month === current ? 'Regista a primeira despesa ou receita do mês.' : null,
  }
}
