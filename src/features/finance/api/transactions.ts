import { PAGE_SIZE, readAllPages } from '@/features/finance/api/paging'
import { monthReadRange, type MonthKey } from '@/features/finance/lib/months'
import { toTransaction } from '@/features/finance/lib/rows'
import { sortTransactions, type Transaction } from '@/features/finance/lib/totals'
import { supabase } from '@/lib/supabase'

// amount::text: the amount arrives as "12.50", never as a JSON number.
const COLUMNS = 'id, kind, category_id, amount::text, occurred_on, merchant, note, created_at'

// One month's transactions (Lisbon's month, occurred_on from its first day to
// the next month's, exclusive), in the list's order: the newest day first, and
// within a day the most recently logged first.
export async function fetchMonthTransactions(month: MonthKey): Promise<Transaction[]> {
  const { from, to } = monthReadRange(month)
  const rows = await readAllPages((afterId) => {
    const query = supabase.from('transactions').select(COLUMNS).gte('occurred_on', from).lt('occurred_on', to)
    return (afterId === null ? query : query.gt('id', afterId)).order('id').limit(PAGE_SIZE)
  })
  return sortTransactions(rows.map(toTransaction))
}
