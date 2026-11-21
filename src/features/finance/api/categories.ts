import { PAGE_SIZE, readAllPages } from '@/features/finance/api/paging'
import {
  isCategoryNameTaken,
  resolveNewCategory,
  suggestedCategoryRows,
  type Category,
  type Kind,
} from '@/features/finance/lib/categories'
import { DuplicateCategoryError, hasCode } from '@/features/finance/lib/errors'
import { toCategory } from '@/features/finance/lib/rows'
import { validateCategoryName } from '@/features/finance/lib/validation'
import { ValidationError, requireRows } from '@/lib/errors'
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

// "Criar categorias sugeridas": every suggested category in one insert, so
// they are created all together or not at all. A unique violation (23505)
// means another tab created them meanwhile: the read that follows shows them.
export async function createSuggestedCategories() {
  const { error } = await supabase.from('categories').insert(suggestedCategoryRows())
  if (error && !hasCode(error, '23505')) throw error
}

function cleanCategoryName(name: string) {
  const result = validateCategoryName(name)
  if (!result.ok) throw new ValidationError(result.error)
  return result.value
}

async function updateCategory(id: string, changes: { name?: string; archived_at?: string | null }) {
  const { data, error } = await supabase.from('categories').update(changes).eq('id', id).select('id')
  if (error) throw error
  requireRows(data)
}

// requireRows applies here (through updateCategory): the category must exist.
export function setCategoryArchived(id: string, archived: boolean) {
  return updateCategory(id, { archived_at: archived ? new Date().toISOString() : null })
}

async function reactivate(category: Category) {
  await setCategoryArchived(category.id, false)
  return { category: { ...category, archivedAt: null }, reactivated: true }
}

// Creates a category, or reactivates an archived one of the same kind with the
// same name (ignoring case and accents). An active one with the same name is
// refused. `existing` is the list the user is looking at; if another tab
// created the name meanwhile, the database's unique violation (23505) leads to
// the same decision on a fresh list, as with exercises.
export async function createCategory(
  kind: Kind,
  name: string,
  existing: Category[],
): Promise<{ category: Category; reactivated: boolean }> {
  const clean = cleanCategoryName(name)

  const decision = resolveNewCategory(existing, kind, clean)
  if (decision.action === 'duplicate') throw new DuplicateCategoryError('create')
  if (decision.action === 'reactivate') return reactivate(decision.category)

  const { data, error } = await supabase.from('categories').insert({ kind, name: clean }).select(COLUMNS).single()
  if (!error) return { category: toCategory(data), reactivated: false }
  if (!hasCode(error, '23505')) throw error

  const retry = resolveNewCategory(await fetchCategories(), kind, clean)
  if (retry.action === 'reactivate') return reactivate(retry.category)
  throw new DuplicateCategoryError('create')
}

// `existing` is the full list (archived included). A name another category of
// the same kind has, ignoring case and accents, is refused here; the database
// only catches the same name ignoring case (23505), turned into the same error.
export async function renameCategory(id: string, kind: Kind, name: string, existing: Category[]) {
  const clean = cleanCategoryName(name)
  if (isCategoryNameTaken(existing, kind, clean, id)) throw new DuplicateCategoryError('rename')
  try {
    await updateCategory(id, { name: clean })
  } catch (error) {
    if (hasCode(error, '23505')) throw new DuplicateCategoryError('rename')
    throw error
  }
}

// A category that nothing uses is deleted; one that transactions, budgets or
// subscriptions use is archived instead. The database decides: the foreign
// keys refuse the delete (23503), and then the category is archived.
export async function removeCategory(id: string): Promise<'deleted' | 'archived'> {
  const { data, error } = await supabase.from('categories').delete().eq('id', id).select('id')
  if (error && hasCode(error, '23503')) {
    await setCategoryArchived(id, true)
    return 'archived'
  }
  if (error) throw error
  requireRows(data)
  return 'deleted'
}
