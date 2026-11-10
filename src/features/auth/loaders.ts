import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { redirect, type LoaderFunctionArgs } from 'react-router'
import { readStoredUserId } from '@/features/auth/lib/stored-session'
import { getSafeReturnPath, takeReturnPath } from '@/features/auth/lib/return-path'
import { supabase } from '@/lib/supabase'

// With a session stored on the device, the app waits at most this long for
// getSession() before going in anyway.
const STORED_SESSION_WAIT_MS = 3000

const timedOut = Symbol('timed out')

// Screens inside the app shell need a session; without one, go to /entrar and
// remember the page that was asked for. getSession() waits for the client to
// start, including the code exchange when returning from Google.
// This loader runs on the first load and on revalidation, not on every
// navigation between pages, since the shell route has no path of its own.
//
// Offline, or on a gym network that does not answer, an expired access token
// makes getSession() retry the refresh for up to 30 seconds. navigator.onLine
// cannot tell: it is often true on a network that does not answer. So when a
// session is stored on the device (readStoredUserId), the wait is capped at
// STORED_SESSION_WAIT_MS and the app goes in anyway: the workout and the copy
// of the data are on the device, and the token is refreshed once the network
// is back. Without a stored session nothing changes: the wait is what decides
// whether to go to /entrar.
export async function requireSession({ request }: LoaderFunctionArgs) {
  const session = supabase.auth.getSession()
  const result = readStoredUserId()
    ? await Promise.race([session, new Promise<typeof timedOut>((done) => setTimeout(() => done(timedOut), STORED_SESSION_WAIT_MS))])
    : await session
  if (result === timedOut) return null

  const { data, error } = result
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
