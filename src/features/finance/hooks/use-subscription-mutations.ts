import { useMutation } from '@tanstack/react-query'
import { financeKeys } from '@/features/finance/api/query-keys'
import {
  archiveSubscription,
  createSubscription,
  deleteSubscription,
  updateSubscription,
} from '@/features/finance/api/subscriptions'
import { useRefetchFinance } from '@/features/finance/hooks/use-refetch-finance'
import type { SubscriptionValues } from '@/features/finance/lib/validation'

// Subscription writes ask again for the subscriptions only.

export function useCreateSubscription() {
  const refetch = useRefetchFinance(financeKeys.subscriptions())
  return useMutation({ mutationFn: (values: SubscriptionValues) => createSubscription(values), onSettled: refetch })
}

export function useUpdateSubscription() {
  const refetch = useRefetchFinance(financeKeys.subscriptions())
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: SubscriptionValues }) => updateSubscription(id, values),
    onSettled: refetch,
  })
}

// Cancelling a subscription archives it.
export function useArchiveSubscription() {
  const refetch = useRefetchFinance(financeKeys.subscriptions())
  return useMutation({ mutationFn: (id: string) => archiveSubscription(id), onSettled: refetch })
}

export function useDeleteSubscription() {
  const refetch = useRefetchFinance(financeKeys.subscriptions())
  return useMutation({ mutationFn: (id: string) => deleteSubscription(id), onSettled: refetch })
}
