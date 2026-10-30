import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-in'; session: Session }
  | { status: 'signed-out' }

let state: AuthState = { status: 'loading' }
const listeners = new Set<() => void>()
const signedOutListeners = new Set<() => void>()

// One subscription for the whole app. INITIAL_SESSION arrives once the client
// has loaded the stored session (and exchanged a PKCE code, if any), which ends
// the loading state. The callback only stores the session and notifies: Supabase
// warns that awaiting other Supabase calls inside it can deadlock.
const { data } = supabase.auth.onAuthStateChange((event, session) => {
  state = session ? { status: 'signed-in', session } : { status: 'signed-out' }
  for (const listener of listeners) listener()
  if (event === 'SIGNED_OUT') {
    for (const listener of signedOutListeners) listener()
  }
})

// Avoid duplicate subscriptions when this module is hot-reloaded in development.
import.meta.hot?.dispose(() => data.subscription.unsubscribe())

export function subscribeToAuth(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getAuthState() {
  return state
}

// Runs on every sign-out: on this device, in another tab (Supabase relays it
// through a BroadcastChannel) or when the session is revoked. Not on
// INITIAL_SESSION without a session, so opening the app offline with an
// expired token does not count as signing out.
export function onSignedOut(listener: () => void) {
  signedOutListeners.add(listener)
  return () => {
    signedOutListeners.delete(listener)
  }
}
