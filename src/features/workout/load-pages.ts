// The single import of the Workout pages, shared by the routes (router.tsx) and
// the preload, so both always fetch the same chunk.
// The promise is deliberately not cached here: the browser already reuses a
// module once it has loaded, and a cached rejected promise would make a failed
// preload (offline) fail again when the tab is tapped, instead of retrying.
export function loadWorkoutPages() {
  return import('@/features/workout/pages')
}

// Fetches the Workout chunk once the browser is idle after the app opens, so
// the tab still works if the connection drops later. Returns the cleanup, for
// a useEffect. requestIdleCallback is missing in some browsers (older Safari),
// hence the timeout.
export function preloadWorkoutPages() {
  // A failed preload is not an error worth reporting: the app may have opened
  // offline, and tapping the tab tries again. Caught silently so it does not
  // show in the console.
  const preload = () => void loadWorkoutPages().catch(() => {})

  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(preload)
    return () => window.cancelIdleCallback(id)
  }
  const id = window.setTimeout(preload, 2000)
  return () => window.clearTimeout(id)
}
