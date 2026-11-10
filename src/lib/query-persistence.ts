// The copy of server reads kept on the device, so the app works without
// network (see Offline handling in docs/decisions.md). Only the Workout reads
// are kept, one copy per account.

// Raised when the shape of the kept data changes: an older copy is then dropped.
export const QUERY_CACHE_BUSTER = '1'

// The copy is dropped after 30 days. The queries it holds stay in memory for
// good (gcTime Infinity, see query-client.ts), or they would leave the copy when
// no screen uses them.
export const QUERY_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

export function queryCacheKey(accountId: string) {
  return `levelup:query-cache:${accountId}`
}

// Only finished Workout reads: never an error, a pending read or another module.
export function shouldPersistQuery(query: { queryKey: readonly unknown[]; state: { status: string } }) {
  return query.state.status === 'success' && query.queryKey[0] === 'workout'
}

// The storage the persister writes to. Writes are delayed (throttled), so one
// can land after a sign-out or an account change: it is dropped unless the
// account is still the current one, so another account's data never comes back.
export function accountStorage(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
  accountId: string,
  getCurrentAccountId: () => string | null,
) {
  return {
    getItem: (key: string) => storage.getItem(key),
    setItem: (key: string, value: string) => {
      if (getCurrentAccountId() === accountId) storage.setItem(key, value)
    },
    removeItem: (key: string) => storage.removeItem(key),
  }
}
