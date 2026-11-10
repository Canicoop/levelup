import { useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { getAccountId, subscribeToAccount } from '@/features/auth/account'
import { queryClient } from '@/lib/query-client'
import {
  QUERY_CACHE_BUSTER,
  QUERY_CACHE_MAX_AGE_MS,
  accountStorage,
  queryCacheKey,
  shouldPersistQuery,
} from '@/lib/query-persistence'

// TanStack Query for the whole app, with the Workout reads kept on the device:
// one copy per account (see query-persistence.ts). While a copy is restored,
// queries wait instead of fetching; restoring is a read of localStorage, so it
// is instant. A new account gets its own provider (key), so copies never mix.
export function QueryProvider({ children }: { children: ReactNode }) {
  const accountId = useSyncExternalStore(subscribeToAccount, getAccountId)

  const persister = useMemo(
    () =>
      accountId
        ? createSyncStoragePersister({
            storage: accountStorage(window.localStorage, accountId, getAccountId),
            key: queryCacheKey(accountId),
          })
        : null,
    [accountId],
  )

  if (!accountId || !persister) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return (
    <PersistQueryClientProvider
      key={accountId}
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: QUERY_CACHE_MAX_AGE_MS,
        buster: QUERY_CACHE_BUSTER,
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  )
}
