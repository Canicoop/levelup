import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router/dom'
import { onSignedOut } from '@/features/auth/session'
import { queryClient } from '@/lib/query-client'
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
