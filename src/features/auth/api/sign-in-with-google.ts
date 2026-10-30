import { supabase } from '@/lib/supabase'

// Sends the browser to Google. Google returns to /entrar, which shows any error
// and moves on once the session exists.
export function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/entrar`,
      // Always show the account chooser, so signing out and in again can
      // switch accounts instead of reusing the last one silently.
      queryParams: { prompt: 'select_account' },
    },
  })
}
