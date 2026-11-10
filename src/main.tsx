import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { onlineManager } from '@tanstack/react-query'
import { RouterProvider } from 'react-router/dom'
import { QueryProvider } from '@/components/query-provider'
import { getAccountId, subscribeToAccount } from '@/features/auth/account'
import { onSignedOut } from '@/features/auth/session'
import { startAppUpdates } from '@/lib/app-update'
import { startOnlineFromNavigator } from '@/lib/online'
import { queryClient } from '@/lib/query-client'
import { queryCacheKey } from '@/lib/query-persistence'
import './index.css'
import { router } from './router.tsx'

// On any sign-out, drop the previous user's cached data and re-run the route
// loaders, so the session guard sends the app to /entrar. This lives here, at
// the entry point, because only this module knows the store, the cache and the
// router, so none of them has to import another. Deferred with setTimeout: the
// loaders call supabase.auth.getSession(), and Supabase warns that calling it
// from inside onAuthStateChange can deadlock.
onSignedOut(() => {
  setTimeout(() => {
    queryClient.clear()
    void router.revalidate()
  }, 0)
})

// The copy of the Workout reads on the device goes when its account does: on a
// sign-out, or when another account signs in. A late write of the old copy is
// refused (see accountStorage), so it does not come back.
let account = getAccountId()
subscribeToAccount(() => {
  const next = getAccountId()
  if (account && account !== next) {
    try {
      localStorage.removeItem(queryCacheKey(account))
    } catch {
      // Storage blocked: there is nothing stored to remove.
    }
    if (next) queryClient.clear()
  }
  account = next
})

// Start from the device's network state, not TanStack's "online" default (see online.ts).
startOnlineFromNavigator(onlineManager, typeof navigator === 'undefined' ? undefined : navigator)

// The service worker, in production builds only (see app-update.ts).
startAppUpdates()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  </StrictMode>,
)
