import { PAGE_SIZE, readAllPages } from '@/features/finance/api/paging'
import type { BudgetRow } from '@/features/finance/lib/budgets'
import { categoryWriteError } from '@/features/finance/lib/errors'
import type { Cents } from '@/features/finance/lib/money'
import { toBudgetArgs, toBudgetRow } from '@/features/finance/lib/rows'
import type { Database } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

// amount::text: the amount arrives as "300.00", or null for "no budget".
const COLUMNS = 'id, category_id, starts_on, amount::text'

// Every budget row, one per change, overall and per category. budgetInForce
// picks the one in force in a month.
export async function fetchBudgets(): Promise<BudgetRow[]> {
  const rows = await readAllPages((afterId) => {
    const query = supabase.from('budgets').select(COLUMNS)
    return (afterId === null ? query : query.gt('id', afterId)).order('id').limit(PAGE_SIZE)
  })
  return rows.map(toBudgetRow)
}

type GeneratedSetBudgetArgs = Database['public']['Functions']['set_budget']['Args']

// Sets this month's budget for a category, or the overall budget with
// categoryId null; cents null removes it from this month on. A second change
// in the same month replaces that month's row (see docs/decisions.md,
// set_budget). Returns the row's id. A category that no longer fits (deleted,
// or not an expense category) throws CategoryUnavailableError.
export async function setBudget(categoryId: string | null, cents: Cents | null): Promise<string> {
  // The generated types say { amount: number; category_id: string }, but
  // set_budget accepts null for both (the overall budget, and no budget), and
  // the app sends the amount as text ("300.00", checked on levelup-dev on
  // 2026-11-21). The generator cannot express either, so the arguments have
  // their own type (SetBudgetArgs) and this one explicit conversion.
  const args = toBudgetArgs(categoryId, cents) as unknown as GeneratedSetBudgetArgs
  const { data, error } = await supabase.rpc('set_budget', args)
  if (error) throw categoryWriteError(error)
  return data
}
