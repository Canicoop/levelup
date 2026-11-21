import { useMutation } from '@tanstack/react-query'
import { setBudget } from '@/features/finance/api/budgets'
import { financeKeys } from '@/features/finance/api/query-keys'
import { useRefetchFinance } from '@/features/finance/hooks/use-refetch-finance'
import type { Cents } from '@/features/finance/lib/money'

// Sets this month's budget: categoryId null is the overall budget, cents null
// removes it from this month on. Asks again for the budgets only.
export function useSetBudget() {
  const refetch = useRefetchFinance(financeKeys.budgets())
  return useMutation({
    mutationFn: ({ categoryId, cents }: { categoryId: string | null; cents: Cents | null }) => setBudget(categoryId, cents),
    onSettled: refetch,
  })
}
