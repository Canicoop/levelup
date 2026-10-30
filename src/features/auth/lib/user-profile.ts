import type { User } from '@supabase/supabase-js'

export type UserProfile = {
  name: string | null
  firstName: string | null
  initial: string | null
  email: string | null
  avatarUrl: string | null
}

// Google's sign-in (through Supabase) stores full_name / name and avatar_url /
// picture in user_metadata; there is no given_name, so the first name is the
// first word of the full name. Metadata can be changed by the user through the
// API, so every value is checked: only non-empty text counts, and the photo
// only over https.
export function getUserProfile(user: User | null): UserProfile {
  const metadata: Record<string, unknown> = user?.user_metadata ?? {}
  const name = text(metadata.full_name) ?? text(metadata.name)
  const firstName = name?.split(/\s+/)[0] ?? null

  return {
    name,
    firstName,
    initial: firstName ? firstName.charAt(0).toLocaleUpperCase('pt-PT') : null,
    email: text(user?.email),
    avatarUrl: httpsUrl(metadata.avatar_url) ?? httpsUrl(metadata.picture),
  }
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

function httpsUrl(value: unknown) {
  const candidate = text(value)
  if (!candidate) return null
  try {
    return new URL(candidate).protocol === 'https:' ? candidate : null
  } catch {
    return null
  }
}
