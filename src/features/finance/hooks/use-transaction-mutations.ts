import { useMutation } from '@tanstack/react-query'
import { financeKeys } from '@/features/finance/api/query-keys'
import { createTransaction, deleteTransaction, updateTransaction } from '@/features/finance/api/transactions'
import { useRefetchFinance } from '@/features/finance/hooks/use-refetch-finance'
import type { TransactionValues } from '@/features/finance/lib/validation'

// Transaction writes ask again for every month: changing a transaction's date
// can move it to another month.

export function useCreateTransaction() {
  const refetch = useRefetchFinance(financeKeys.transactions())
  return useMutation({ mutationFn: (values: TransactionValues) => createTransaction(values), onSettled: refetch })
}

export function useUpdateTransaction() {
  const refetch = useRefetchFinance(financeKeys.transactions())
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: TransactionValues }) => updateTransaction(id, values),
    onSettled: refetch,
  })
}

export function useDeleteTransaction() {
  const refetch = useRefetchFinance(financeKeys.transactions())
  return useMutation({ mutationFn: (id: string) => deleteTransaction(id), onSettled: refetch })
}
