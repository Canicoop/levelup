import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { getSupabaseConfig } from '@/lib/supabase-config'

const { url, key } = getSupabaseConfig(import.meta.env)

// The only Supabase client in the app. It uses the publishable key: access to
// data is enforced by Row Level Security, never by the frontend. Database comes
// from `supabase gen types` (src/lib/database.types.ts), regenerated after each
// migration.
export const supabase = createClient<Database>(url, key, {
  auth: {
    // Authorization code flow with PKCE: the Google redirect returns a one-time
    // code, not tokens in the URL.
    flowType: 'pkce',
    // Exchange that code automatically when the app loads on the redirect URL.
    detectSessionInUrl: true,
    // Keep the session in the default storage (localStorage) and refresh the
    // access token before it expires.
    persistSession: true,
    autoRefreshToken: true,
  },
})
