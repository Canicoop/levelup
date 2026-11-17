import { preloadWhenIdle } from '@/lib/preload'

// The single import of the Workout pages, shared by the routes (router.tsx) and
// the preload, so both always fetch the same chunk.
// The promise is deliberately not cached here: the browser already reuses a
// module once it has loaded, and a cached rejected promise would make a failed
// preload (offline) fail again when the tab is tapped, instead of retrying.
export function loadWorkoutPages() {
  return import('@/features/workout/pages')
}

// Fetches the Workout chunk once the browser is idle after the app opens, so
// the tab still works if the connection drops later (see preloadWhenIdle).
export function preloadWorkoutPages() {
  return preloadWhenIdle(loadWorkoutPages)
}
