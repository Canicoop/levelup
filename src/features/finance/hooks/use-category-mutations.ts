import { useMutation } from '@tanstack/react-query'
import {
  createCategory,
  createSuggestedCategories,
  removeCategory,
  renameCategory,
  setCategoryArchived,
} from '@/features/finance/api/categories'
import { financeKeys } from '@/features/finance/api/query-keys'
import type { Category, Kind } from '@/features/finance/lib/categories'
import { useRefetchFinance } from '@/features/finance/hooks/use-refetch-finance'

// Category writes ask again for the categories only: transactions, budgets and
// subscriptions keep the category's id, and its name comes from this list.

export function useCreateSuggestedCategories() {
  const refetch = useRefetchFinance(financeKeys.categories())
  return useMutation({ mutationFn: () => createSuggestedCategories(), onSettled: refetch })
}

// `categories` is the full list (archived included), used to decide between
// creating, reactivating and refusing a duplicate.
export function useCreateCategory() {
  const refetch = useRefetchFinance(financeKeys.categories())
  return useMutation({
    mutationFn: ({ kind, name, categories }: { kind: Kind; name: string; categories: Category[] }) =>
      createCategory(kind, name, categories),
    onSettled: refetch,
  })
}

// `categories` is the full list, to refuse a name another category of the kind has.
export function useRenameCategory() {
  const refetch = useRefetchFinance(financeKeys.categories())
  return useMutation({
    mutationFn: ({ id, kind, name, categories }: { id: string; kind: Kind; name: string; categories: Category[] }) =>
      renameCategory(id, kind, name, categories),
    onSettled: refetch,
  })
}

export function useSetCategoryArchived() {
  const refetch = useRefetchFinance(financeKeys.categories())
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => setCategoryArchived(id, archived),
    onSettled: refetch,
  })
}

// Deletes the category, or archives it when anything uses it; the result says
// which ('deleted' or 'archived').
export function useRemoveCategory() {
  const refetch = useRefetchFinance(financeKeys.categories())
  return useMutation({ mutationFn: (id: string) => removeCategory(id), onSettled: refetch })
}
