import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { QueryClientProvider, dehydrate } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { getAccountId, subscribeToAccount } from '@/features/auth/account'
import { queryClient } from '@/lib/query-client'
import {
  QUERY_CACHE_BUSTER,
  QUERY_CACHE_MAX_AGE_MS,
  copyStorage,
  queryCacheKey,
  shouldPersistQuery,
  trimForCopy,
} from '@/lib/query-persistence'

// One account's copy: the persister, and a way to save at once. Nothing is
// written until the copy has been restored (see copyStorage).
function createAccountCopy(accountId: string) {
  let restored = false
  const key = queryCacheKey(accountId)
  const storage = copyStorage({
    storage: window.localStorage,
    accountId,
    getCurrentAccountId: getAccountId,
    isRestored: () => restored,
  })

  return {
    // The history keeps only its first page in the copy (see trimForCopy).
    persister: createSyncStoragePersister({
      storage,
      key,
      serialize: (client) => JSON.stringify({ ...client, clientState: trimForCopy(client.clientState) }),
    }),
    markRestored() {
      restored = true
    },
    // The persister writes a second late. iOS can freeze or close an installed
    // app as soon as it leaves the screen, and a write still waiting would be
    // lost, so this writes at once when the page is hidden or closed.
    saveNow() {
      try {
        const clientState = trimForCopy(dehydrate(queryClient, { shouldDehydrateQuery: shouldPersistQuery }))
        storage.setItem(key, JSON.stringify({ buster: QUERY_CACHE_BUSTER, timestamp: Date.now(), clientState }))
      } catch {
        // Storage full or blocked: the copy stays as it was.
      }
    },
  }
}

// TanStack Query for the whole app, with the Workout reads kept on the device:
// one copy per account (see query-persistence.ts). While a copy is restored,
// queries wait instead of fetching; restoring is a read of localStorage, so it
// is instant. A new account gets its own provider (key), so copies never mix.
export function QueryProvider({ children }: { children: ReactNode }) {
  const accountId = useSyncExternalStore(subscribeToAccount, getAccountId)
  const copy = useMemo(() => (accountId ? createAccountCopy(accountId) : null), [accountId])

  useEffect(() => {
    if (!copy) return
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') copy.saveNow()
    }
    const onPageHide = () => copy.saveNow()
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [copy])

  if (!accountId || !copy) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return (
    <PersistQueryClientProvider
      key={accountId}
      client={queryClient}
      persistOptions={{
        persister: copy.persister,
        maxAge: QUERY_CACHE_MAX_AGE_MS,
        buster: QUERY_CACHE_BUSTER,
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
      }}
      // Writing starts only now, whether the restore found a copy or not.
      onSuccess={copy.markRestored}
      onError={copy.markRestored}
    >
      {children}
    </PersistQueryClientProvider>
  )
}
