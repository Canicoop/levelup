import { preloadWhenIdle } from '@/lib/preload'

// The single import of the Weight pages, shared by the route (router.tsx) and
// the preload, so both always fetch the same chunk. As in the Workout module
// (see src/features/workout/load-pages.ts), the promise is not cached: the
// browser reuses a loaded module, and a cached rejected promise would make a
// failed load fail again instead of retrying.
export function loadWeightPages() {
  return import('@/features/weight/pages')
}

// Fetches the Weight chunk once the browser is idle after the app opens, so
// the tab still works if the connection drops later (see preloadWhenIdle).
export function preloadWeightPages() {
  return preloadWhenIdle(loadWeightPages)
}
