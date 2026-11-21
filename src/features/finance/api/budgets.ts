import { PAGE_SIZE, readAllPages } from '@/features/finance/api/paging'
import type { BudgetRow } from '@/features/finance/lib/budgets'
import { toBudgetRow } from '@/features/finance/lib/rows'
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
