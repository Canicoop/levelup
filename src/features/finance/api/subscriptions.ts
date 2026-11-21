import { PAGE_SIZE, readAllPages } from '@/features/finance/api/paging'
import { toSubscription } from '@/features/finance/lib/rows'
import type { Subscription } from '@/features/finance/lib/subscriptions'
import { supabase } from '@/lib/supabase'

// amount::text: the amount arrives as "10.99", never as a JSON number.
const COLUMNS = 'id, name, amount::text, interval_months, reference_date, category_id, archived_at'

// Every subscription, archived included. upcomingPayments and monthlyTotal
// keep the active ones.
export async function fetchSubscriptions(): Promise<Subscription[]> {
  const rows = await readAllPages((afterId) => {
    const query = supabase.from('subscriptions').select(COLUMNS)
    return (afterId === null ? query : query.gt('id', afterId)).order('id').limit(PAGE_SIZE)
  })
  return rows.map(toSubscription)
}
