import type { BudgetRow } from '@/features/finance/lib/budgets'
import type { Category, Kind } from '@/features/finance/lib/categories'
import { parseDbAmount } from '@/features/finance/lib/money'
import { monthOfDay } from '@/features/finance/lib/months'
import { INTERVAL_MONTHS, type IntervalMonths, type Subscription } from '@/features/finance/lib/subscriptions'
import type { Transaction } from '@/features/finance/lib/totals'

// The finance tables' rows as the Data API returns them, and their conversion
// into the app's types. Amounts are read as amount::text, so they arrive as
// text and become whole cents without passing through a floating-point number.
// A value the checks never allow (another kind, another period) is a bug, not
// data, so the conversion throws and the read fails visibly.

export type DbCategory = { id: string; kind: string; name: string; archived_at: string | null }

export type DbTransaction = {
  id: string
  kind: string
  category_id: string
  amount: string
  occurred_on: string
  merchant: string | null
  note: string | null
  created_at: string
}

export type DbBudget = { id: string; category_id: string | null; starts_on: string; amount: string | null }

export type DbSubscription = {
  id: string
  name: string
  amount: string
  interval_months: number
  reference_date: string
  category_id: string
  archived_at: string | null
}

function toKind(value: string): Kind {
  if (value === 'expense' || value === 'income') return value
  throw new Error(`Unexpected kind from the database: ${JSON.stringify(value)}`)
}

function toIntervalMonths(value: number): IntervalMonths {
  const interval = INTERVAL_MONTHS.find((months) => months === value)
  if (interval === undefined) throw new Error(`Unexpected interval from the database: ${value}`)
  return interval
}

export function toCategory(row: DbCategory): Category {
  return { id: row.id, kind: toKind(row.kind), name: row.name, archivedAt: row.archived_at }
}

export function toTransaction(row: DbTransaction): Transaction {
  return {
    id: row.id,
    kind: toKind(row.kind),
    categoryId: row.category_id,
    cents: parseDbAmount(row.amount),
    day: row.occurred_on,
    createdAt: row.created_at,
    merchant: row.merchant,
    note: row.note,
  }
}

// starts_on is always a month's first day; null amount is "no budget from this
// month on".
export function toBudgetRow(row: DbBudget): BudgetRow {
  return {
    categoryId: row.category_id,
    month: monthOfDay(row.starts_on),
    cents: row.amount === null ? null : parseDbAmount(row.amount),
  }
}

export function toSubscription(row: DbSubscription): Subscription {
  return {
    id: row.id,
    name: row.name,
    cents: parseDbAmount(row.amount),
    intervalMonths: toIntervalMonths(row.interval_months),
    referenceDate: row.reference_date,
    categoryId: row.category_id,
    archivedAt: row.archived_at,
  }
}
