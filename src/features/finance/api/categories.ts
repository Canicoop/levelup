import { PAGE_SIZE, readAllPages } from '@/features/finance/api/paging'
import type { Category } from '@/features/finance/lib/categories'
import { toCategory } from '@/features/finance/lib/rows'
import { supabase } from '@/lib/supabase'

const COLUMNS = 'id, kind, name, archived_at'

// Every category of the user, archived included, in no particular order:
// activeCategories sorts them by name in European Portuguese.
export async function fetchCategories(): Promise<Category[]> {
  const rows = await readAllPages((afterId) => {
    const query = supabase.from('categories').select(COLUMNS)
    return (afterId === null ? query : query.gt('id', afterId)).order('id').limit(PAGE_SIZE)
  })
  return rows.map(toCategory)
}
