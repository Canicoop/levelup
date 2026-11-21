import { PAGE_SIZE, readAllPages } from '@/features/finance/api/paging'
import { categoryWriteError } from '@/features/finance/lib/errors'
import { toSubscription, toSubscriptionWrite } from '@/features/finance/lib/rows'
import type { Subscription } from '@/features/finance/lib/subscriptions'
import type { SubscriptionValues } from '@/features/finance/lib/validation'
import type { Database } from '@/lib/database.types'
import { requireRows } from '@/lib/errors'
import { supabase } from '@/lib/supabase'

// amount::text: the amount arrives as "10.99", never as a JSON number.
const COLUMNS = 'id, name, amount::text, interval_months, reference_date, category_id, archived_at'

// The generated types say amount is a number, but the app sends it as text
// ("10.99"), which the Data API accepts (checked on levelup-dev on 2026-11-21),
// so it never goes through a floating-point number. The generator cannot
// express that, so the write has its own type (SubscriptionWrite, only the
// columns with a privilege) and one explicit conversion at each call.
type GeneratedInsert = Database['public']['Tables']['subscriptions']['Insert']
type GeneratedUpdate = Database['public']['Tables']['subscriptions']['Update']

// Every subscription, archived included. upcomingPayments and monthlyTotal
// keep the active ones.
export async function fetchSubscriptions(): Promise<Subscription[]> {
  const rows = await readAllPages((afterId) => {
    const query = supabase.from('subscriptions').select(COLUMNS)
    return (afterId === null ? query : query.gt('id', afterId)).order('id').limit(PAGE_SIZE)
  })
  return rows.map(toSubscription)
}

// The values come from validateSubscription. A category that no longer fits
// (deleted, or not an expense category) throws CategoryUnavailableError.
export async function createSubscription(values: SubscriptionValues): Promise<Subscription> {
  const write = toSubscriptionWrite(values) as unknown as GeneratedInsert
  const { data, error } = await supabase.from('subscriptions').insert(write).select(COLUMNS).single()
  if (error) throw categoryWriteError(error)
  return toSubscription(data)
}

// One that no longer exists throws NotFoundError.
export async function updateSubscription(id: string, values: SubscriptionValues): Promise<Subscription> {
  const write = toSubscriptionWrite(values) as unknown as GeneratedUpdate
  const { data, error } = await supabase.from('subscriptions').update(write).eq('id', id).select(COLUMNS)
  if (error) throw categoryWriteError(error)
  return toSubscription(requireRows(data)[0])
}

// Cancelling a subscription archives it.
export async function archiveSubscription(id: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
  if (error) throw error
  requireRows(data)
}

// Nothing refers to a subscription in version A, so any can be deleted. One
// that no longer exists throws NotFoundError.
export async function deleteSubscription(id: string) {
  const { data, error } = await supabase.from('subscriptions').delete().eq('id', id).select('id')
  if (error) throw error
  requireRows(data)
}
