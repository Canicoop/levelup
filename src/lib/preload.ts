// Runs `load` (a lazy module's import) once the browser is idle after the app
// opens, so the module still works if the connection drops later. Returns the
// cleanup, for a useEffect. requestIdleCallback is missing in some browsers
// (older Safari), hence the timeout.
export function preloadWhenIdle(load: () => Promise<unknown>) {
  // A failed preload is not an error worth reporting: the app may have opened
  // offline, and opening the page tries again. Caught silently so it does not
  // show in the console.
  const preload = () => void load().catch(() => {})

  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(preload)
    return () => window.cancelIdleCallback(id)
  }
  const id = window.setTimeout(preload, 2000)
  return () => window.clearTimeout(id)
}
