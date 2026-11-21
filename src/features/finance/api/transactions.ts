import { PAGE_SIZE, readAllPages } from '@/features/finance/api/paging'
import { transactionWriteError } from '@/features/finance/lib/errors'
import { monthReadRange, type MonthKey } from '@/features/finance/lib/months'
import { toTransaction, toTransactionWrite } from '@/features/finance/lib/rows'
import { sortTransactions, type Transaction } from '@/features/finance/lib/totals'
import type { TransactionValues } from '@/features/finance/lib/validation'
import type { Database } from '@/lib/database.types'
import { requireRows } from '@/lib/errors'
import { supabase } from '@/lib/supabase'

// amount::text: the amount arrives as "12.50", never as a JSON number.
const COLUMNS = 'id, kind, category_id, amount::text, occurred_on, merchant, note, created_at'

// The generated types say amount is a number, but the app sends it as text
// ("12.50"), which the Data API accepts (checked on levelup-dev on 2026-11-21),
// so it never goes through a floating-point number. The generator cannot
// express that, so the write has its own type (TransactionWrite, only the
// columns with a privilege) and one explicit conversion at each call.
type GeneratedInsert = Database['public']['Tables']['transactions']['Insert']
type GeneratedUpdate = Database['public']['Tables']['transactions']['Update']

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

// The values come from validateTransaction. A day after Lisbon's today throws
// FutureDayError, a category that no longer fits CategoryUnavailableError (see
// transactionWriteError).
export async function createTransaction(values: TransactionValues): Promise<Transaction> {
  const write = toTransactionWrite(values) as unknown as GeneratedInsert
  const { data, error } = await supabase.from('transactions').insert(write).select(COLUMNS).single()
  if (error) throw transactionWriteError(error)
  return toTransaction(data)
}

// Any field can change, the day and the kind included. One that no longer
// exists throws NotFoundError.
export async function updateTransaction(id: string, values: TransactionValues): Promise<Transaction> {
  const write = toTransactionWrite(values) as unknown as GeneratedUpdate
  const { data, error } = await supabase.from('transactions').update(write).eq('id', id).select(COLUMNS)
  if (error) throw transactionWriteError(error)
  return toTransaction(requireRows(data)[0])
}

// One that no longer exists throws NotFoundError.
export async function deleteTransaction(id: string) {
  const { data, error } = await supabase.from('transactions').delete().eq('id', id).select('id')
  if (error) throw error
  requireRows(data)
}
