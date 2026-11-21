import { compareCategoryNames, type Category, type Kind } from '@/features/finance/lib/categories'
import type { Cents } from '@/features/finance/lib/money'
import type { DayKey } from '@/lib/lisbon-day'

// A transaction as the app keeps it: the amount already in whole cents.
export type Transaction = {
  id: string
  kind: Kind
  categoryId: string
  cents: Cents
  day: DayKey
  // The database's created_at, as the Data API returns it (always in UTC with
  // the same format), so comparing the text compares the instants.
  createdAt: string
  merchant: string | null
  note: string | null
}

// What came in, what went out and the balance, all in whole cents.
export function monthTotals(transactions: Transaction[]): { income: Cents; expenses: Cents; balance: Cents } {
  let income = 0
  let expenses = 0
  for (const transaction of transactions) {
    if (transaction.kind === 'income') income += transaction.cents
    else expenses += transaction.cents
  }
  return { income, expenses, balance: income - expenses }
}

// Spending per category: expenses only, the largest first, and by name when two
// are equal (with "Outros" last). Archived categories count: old transactions
// still use them. A category missing from the list (not read yet) comes as
// null, after the named ones, so its spending is never hidden.
export function spendingByCategory(
  transactions: Transaction[],
  categories: Category[],
): { categoryId: string; category: Category | null; cents: Cents }[] {
  const sums = new Map<string, Cents>()
  for (const transaction of transactions) {
    if (transaction.kind !== 'expense') continue
    sums.set(transaction.categoryId, (sums.get(transaction.categoryId) ?? 0) + transaction.cents)
  }

  const byId = new Map(categories.map((category) => [category.id, category]))
  return [...sums]
    .map(([categoryId, cents]) => ({ categoryId, category: byId.get(categoryId) ?? null, cents }))
    .sort((a, b) => {
      if (a.cents !== b.cents) return b.cents - a.cents
      if (a.category && b.category) return compareCategoryNames(a.category.name, b.category.name)
      if (a.category || b.category) return a.category ? -1 : 1
      return a.categoryId < b.categoryId ? -1 : a.categoryId > b.categoryId ? 1 : 0
    })
}

function descending(a: string, b: string) {
  return a < b ? 1 : a > b ? -1 : 0
}

// The list's order: the newest day first and, within a day, the most recently
// logged first (created_at), with the id as the last tie-break. Returns a new
// array.
export function sortTransactions(transactions: Transaction[]) {
  return [...transactions].sort(
    (a, b) => descending(a.day, b.day) || descending(a.createdAt, b.createdAt) || descending(a.id, b.id),
  )
}
