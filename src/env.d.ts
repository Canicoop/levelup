// Variables from .env.local. Both are public (see .env.example).
// Typed as possibly undefined so the code has to check them.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string | undefined
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string | undefined
}
