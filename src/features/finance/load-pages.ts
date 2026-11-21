// The single import of the Finance pages, shared by their routes (router.tsx),
// so both always fetch the same chunk. As in the Workout and Weight modules
// (see src/features/weight/load-pages.ts), the promise is not cached: the
// browser reuses a loaded module, and a cached rejected promise would make a
// failed load fail again instead of retrying. Preloading it when idle comes
// with the copy on the device (step 7.5b).
export function loadFinancePages() {
  return import('@/features/finance/pages')
}
