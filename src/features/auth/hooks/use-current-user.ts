import { useMemo } from 'react'
import { useSession } from '@/features/auth/hooks/use-session'
import { getUserProfile } from '@/features/auth/lib/user-profile'

// The signed-in user's name, email and photo. While the session is loading, or
// when it is unavailable inside the app (offline with an expired token), every
// field is null, so screens fall back to a neutral state.
export function useCurrentUser() {
  const auth = useSession()
  const user = auth.status === 'signed-in' ? auth.session.user : null
  return { status: auth.status, ...useMemo(() => getUserProfile(user), [user]) }
}
