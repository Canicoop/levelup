// The single import of the Weight pages, used by the route (router.tsx). As
// in the Workout module (see src/features/workout/load-pages.ts), the promise
// is not cached: the browser reuses a loaded module, and a cached rejected
// promise would make a failed load fail again instead of retrying.
export function loadWeightPages() {
  return import('@/features/weight/pages')
}
