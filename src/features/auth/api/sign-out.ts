import { onSignedOut } from '@/features/auth/session'
import { supabase } from '@/lib/supabase'

// Signs out on this device only. Without network the local session is still
// removed (the server is not told), except when the access token has also
// expired: then the refresh is retried for up to 30 seconds and the session
// stays. `signedOut` says which happened, from the SIGNED_OUT event that
// Supabase emits before signOut() returns, without calling getSession() again.
export async function signOut() {
  let signedOut = false
  const stopListening = onSignedOut(() => {
    signedOut = true
  })
  try {
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    return { signedOut, error }
  } finally {
    stopListening()
  }
}
