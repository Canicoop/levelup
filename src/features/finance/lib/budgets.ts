import type { Cents } from '@/features/finance/lib/money'
import type { MonthKey } from '@/features/finance/lib/months'

// A row of the budgets table: one change, from a month on (see docs/decisions.md,
// Finance tables). categoryId null is the overall budget; cents null is "no
// budget from this month on".
export type BudgetRow = {
  categoryId: string | null
  month: MonthKey
  cents: Cents | null
}

// The budget in force in a month for a category, or for the overall budget with
// null: the latest row of that category (or of the overall budget) starting in
// that month or before. null when there is none, or when it was removed. The
// overall budget and the categories never mix, and the order of the rows does
// not matter.
export function budgetInForce(rows: BudgetRow[], categoryId: string | null, month: MonthKey): Cents | null {
  let latest: BudgetRow | undefined
  for (const row of rows) {
    if (row.categoryId !== categoryId || row.month > month) continue
    if (!latest || row.month > latest.month) latest = row
  }
  return latest?.cents ?? null
}

// Every budget in force in a month, without the removed ones.
export function budgetsInForce(rows: BudgetRow[], month: MonthKey): { overall: Cents | null; byCategory: Map<string, Cents> } {
  const byCategory = new Map<string, Cents>()
  const categoryIds = new Set(rows.flatMap((row) => (row.categoryId === null ? [] : [row.categoryId])))
  for (const categoryId of categoryIds) {
    const cents = budgetInForce(rows, categoryId, month)
    if (cents !== null) byCategory.set(categoryId, cents)
  }
  return { overall: budgetInForce(rows, null, month), byCategory }
}

// How a month's spending compares with a budget, in whole cents. Going over is
// never red (see docs/decisions.md, Finance module): the text says so and the
// bar stays full. `filled` is the bar's fraction, from 0 to 1, the only value
// that is not whole cents, and only for drawing.
export function budgetProgress(
  budget: Cents,
  spent: Cents,
): { budget: Cents; spent: Cents; remaining: Cents; over: Cents; filled: number } {
  return {
    budget,
    spent,
    remaining: Math.max(budget - spent, 0),
    over: Math.max(spent - budget, 0),
    filled: budget > 0 ? Math.min(spent / budget, 1) : 1,
  }
}
