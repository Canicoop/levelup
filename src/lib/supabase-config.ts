type SupabaseEnv = {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

// Reads the Supabase settings or throws a clear error naming what is missing.
// Empty values count as missing. The values themselves are never included in the
// message. Pure, so it can be tested with any object, not only import.meta.env.
export function getSupabaseConfig(env: SupabaseEnv) {
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) {
    const missing = [!url && 'VITE_SUPABASE_URL', !key && 'VITE_SUPABASE_PUBLISHABLE_KEY']
      .filter(Boolean)
      .join(', ')
    throw new Error(
      `Missing Supabase configuration: ${missing}. Copy .env.example to .env.local, fill it in and restart the dev server.`,
    )
  }

  return { url, key }
}
