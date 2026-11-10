import { readStoredUserId } from '@/features/auth/lib/stored-session'
import { getAuthState, onSignedOut, subscribeToAuth } from '@/features/auth/session'

// The account whose data the device holds: the workout in progress and the
// copy of the Workout reads. Offline with an expired token the auth state is
// signed-out although the session is still stored, so the stored account counts
// until a real sign-out (see readStoredUserId). Notifies only when the account
// changes, not on each token refresh.
let accountId: string | null = null
let signedOut = false
const listeners = new Set<() => void>()

function currentAccountId() {
  const auth = getAuthState()
  if (auth.status === 'signed-in') {
    signedOut = false
    return auth.session.user.id
  }
  return signedOut ? null : readStoredUserId()
}

function sync() {
  const next = currentAccountId()
  if (next === accountId) return
  accountId = next
  for (const listener of listeners) listener()
}

const unsubscribeFromAuth = subscribeToAuth(sync)
const unsubscribeFromSignOut = onSignedOut(() => {
  signedOut = true
  sync()
})
sync()

// Avoid duplicate subscriptions when this module is hot-reloaded in development.
import.meta.hot?.dispose(() => {
  unsubscribeFromAuth()
  unsubscribeFromSignOut()
})

export function getAccountId() {
  return accountId
}

export function subscribeToAccount(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
