import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/lib/supabase-config'

const { url, key } = getSupabaseConfig(import.meta.env)

// The only Supabase client in the app. It uses the publishable key: access to
// data is enforced by Row Level Security, never by the frontend.
export const supabase = createClient(url, key)
