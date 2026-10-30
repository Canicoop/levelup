import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-in'; session: Session }
  | { status: 'signed-out' }

let state: AuthState = { status: 'loading' }
const listeners = new Set<() => void>()

// One subscription for the whole app. INITIAL_SESSION arrives once the client
// has loaded the stored session (and exchanged a PKCE code, if any), which ends
// the loading state. The callback only stores the session: Supabase warns that
// awaiting other Supabase calls inside it can deadlock.
const { data } = supabase.auth.onAuthStateChange((_event, session) => {
  state = session ? { status: 'signed-in', session } : { status: 'signed-out' }
  for (const listener of listeners) listener()
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
