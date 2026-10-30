const STORAGE_KEY = 'levelup:return-path'

// Control characters, including tab and newlines, which the URL parser
// silently removes (so "/\t/evil.com" would become "//evil.com").
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/

// Returns a path inside the app to go to after sign-in, or "/" when the value
// is missing or could lead outside it.
export function getSafeReturnPath(value: string | null | undefined, origin: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  if (value.includes('\\') || CONTROL_CHARACTERS.test(value)) return '/'

  let url: URL
  try {
    url = new URL(value, origin)
  } catch {
    return '/'
  }
  if (url.origin !== origin) return '/'

  const path = url.pathname + url.search + url.hash
  // "/..//evil.com" resolves to the path "//evil.com", which React Router's
  // redirect() would treat as an external URL.
  if (path.startsWith('//')) return '/'
  // Returning to the sign-in page would loop.
  if (url.pathname === '/entrar') return '/'
  return path
}

// The page to return to is kept in sessionStorage while the browser goes to
// Google and back, so it never travels through Supabase's or Google's URLs.
// It is validated when saved and again when read. Storage can throw (private
// browsing on older Safari); the app then simply returns to Home.
export function saveReturnPath(value: string | null) {
  if (!value) return
  const path = getSafeReturnPath(value, window.location.origin)
  if (path === '/') return
  try {
    sessionStorage.setItem(STORAGE_KEY, path)
  } catch {
    // Not saved: sign-in returns to Home.
  }
}

// Reads the saved page and removes it, so it is not reused by a later sign-in.
export function takeReturnPath() {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
    return value
  } catch {
    return null
  }
}
