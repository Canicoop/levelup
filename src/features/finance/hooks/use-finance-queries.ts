import { useQuery } from '@tanstack/react-query'
import { fetchBudgets } from '@/features/finance/api/budgets'
import { fetchCategories } from '@/features/finance/api/categories'
import { financeKeys } from '@/features/finance/api/query-keys'
import { fetchSubscriptions } from '@/features/finance/api/subscriptions'
import { fetchMonthTransactions } from '@/features/finance/api/transactions'
import type { MonthKey } from '@/features/finance/lib/months'

// Every category, archived included.
export function useCategories() {
  return useQuery({ queryKey: financeKeys.categories(), queryFn: fetchCategories })
}

// One month's transactions, in the list's order.
export function useMonthTransactions(month: MonthKey) {
  return useQuery({ queryKey: financeKeys.monthTransactions(month), queryFn: () => fetchMonthTransactions(month) })
}

// Every budget row, one per change.
export function useBudgets() {
  return useQuery({ queryKey: financeKeys.budgets(), queryFn: fetchBudgets })
}

// Every subscription, archived included.
export function useSubscriptions() {
  return useQuery({ queryKey: financeKeys.subscriptions(), queryFn: fetchSubscriptions })
}
