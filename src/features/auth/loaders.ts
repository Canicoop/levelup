import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { redirect, type LoaderFunctionArgs } from 'react-router'
import { getSafeReturnPath, takeReturnPath } from '@/features/auth/lib/return-path'
import { supabase } from '@/lib/supabase'

// Screens inside the app shell need a session; without one, go to /entrar and
// remember the page that was asked for. getSession() waits for the client to
// start, including the code exchange when returning from Google.
// This loader runs on the first load and on revalidation, not on every
// navigation between pages, since the shell route has no path of its own.
export async function requireSession({ request }: LoaderFunctionArgs) {
  const { data, error } = await supabase.auth.getSession()
  // Offline with an expired access token: the session is still stored and will
  // be refreshed once the network is back, so stay in the app. Queries pause
  // until then. Waiting for the failed refresh can take up to 30 seconds.
  if (data.session || (error && isAuthRetryableFetchError(error))) return null

  const { pathname, search } = new URL(request.url)
  const next = pathname + search
  throw redirect(next === '/' ? '/entrar' : `/entrar?next=${encodeURIComponent(next)}`)
}

// With a session, /entrar goes back into the app: to the saved page, or Home.
export async function redirectIfSignedIn({ request }: LoaderFunctionArgs) {
  const { data } = await supabase.auth.getSession()
  if (!data.session) return null

  const url = new URL(request.url)
  const next = takeReturnPath() ?? url.searchParams.get('next')
  throw redirect(getSafeReturnPath(next, url.origin))
}
