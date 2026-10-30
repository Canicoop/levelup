export type SignInError = 'cancelled' | 'failed'

export type RedirectResult = {
  error: SignInError | null
  // Supabase's technical message, for the console only.
  description: string | null
  hasCode: boolean
}

// Reads what the Google redirect left in the URL. Supabase adds `code` when
// sign-in succeeded and `error` (with `error_description`) when it did not;
// `access_denied` means the user cancelled on Google's screen. Both the query
// string and the hash are read, since errors can arrive in either.
export function readRedirectResult(search: string, hash: string): RedirectResult {
  const params = new URLSearchParams(search)
  for (const [key, value] of new URLSearchParams(hash.replace(/^#/, ''))) {
    if (!params.has(key)) params.set(key, value)
  }

  const error = params.get('error')
  return {
    error: error ? (error === 'access_denied' ? 'cancelled' : 'failed') : null,
    description: params.get('error_description'),
    hasCode: params.has('code'),
  }
}
