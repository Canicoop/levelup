import { useSyncExternalStore } from 'react'
import { getAuthState, subscribeToAuth } from '@/features/auth/session'

// The current auth state. Re-renders on sign-in, sign-out and token refresh.
export function useSession() {
  return useSyncExternalStore(subscribeToAuth, getAuthState)
}
