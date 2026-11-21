import type { MonthKey } from '@/features/finance/lib/months'

// Query keys for the Finance module. Every key starts with all. Each write asks
// again only for its own key (see the mutation hooks); a transaction write asks
// for every month, since changing its date can move it to another month.
export const financeKeys = {
  all: ['finance'] as const,
  // Every category, archived included.
  categories: () => [...financeKeys.all, 'categories'] as const,
  transactions: () => [...financeKeys.all, 'transactions'] as const,
  // One month's transactions ("2026-11"), the list's order.
  monthTransactions: (month: MonthKey) => [...financeKeys.transactions(), month] as const,
  // Every budget row, one per change.
  budgets: () => [...financeKeys.all, 'budgets'] as const,
  // Every subscription, archived included.
  subscriptions: () => [...financeKeys.all, 'subscriptions'] as const,
}
