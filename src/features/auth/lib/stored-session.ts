import { getSupabaseConfig } from '@/lib/supabase-config'

// The key Supabase's client stores the session under, by default:
// sb-<first part of the project's host>-auth-token. The client keeps it in a
// protected field, so it is worked out here, the same way.
export function storedSessionKey(supabaseUrl: string) {
  return `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
}

// The stored value is the session as JSON, with the account in `user.id`.
export function parseStoredUserId(raw: string | null) {
  if (raw === null) return null
  try {
    const session: unknown = JSON.parse(raw)
    if (typeof session !== 'object' || session === null || !('user' in session)) return null
    const { user } = session
    if (typeof user !== 'object' || user === null || !('id' in user)) return null
    return typeof user.id === 'string' ? user.id : null
  } catch {
    return null
  }
}

// The account of the session stored on this device, read without the network.
// Why: opening the app offline with an expired token leaves the auth state
// signed-out while the session is still stored (see Route protection in
// docs/decisions.md), and a workout in progress must still be found at the gym.
// This is the only place that knows Supabase's storage format: if an upgrade
// changes the key or the JSON, fix storedSessionKey and parseStoredUserId.
export function readStoredUserId() {
  try {
    const { url } = getSupabaseConfig(import.meta.env)
    return parseStoredUserId(localStorage.getItem(storedSessionKey(url)))
  } catch {
    return null
  }
}
