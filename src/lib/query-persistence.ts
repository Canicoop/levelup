// The copy of server reads kept on the device, so the app works without
// network (see Offline handling in docs/decisions.md). Only the Workout reads
// are kept, one copy per account.

import { toISODate } from '@/lib/format'

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

// A read of finished workouts of this kind ('history', 'month', …).
function isWorkoutsRead(queryKey: readonly unknown[], kind: string) {
  return queryKey[0] === 'workout' && queryKey[1] === 'workouts' && queryKey[2] === kind
}

// Infinite reads whose copy keeps only their first page (the history): the
// other pages are asked for again when they are needed, so the copy does not
// grow with every "Ver mais".
function keepsFirstPageOnly(queryKey: readonly unknown[]) {
  return isWorkoutsRead(queryKey, 'history')
}

// The months of Home's calendar the copy keeps: this one and the one before
// ("2026-11", "2026-10"). Others are asked for again when shown.
function keptMonths(now: Date) {
  const month = (date: Date) => toISODate(date).slice(0, 7)
  return new Set([month(now), month(new Date(now.getFullYear(), now.getMonth() - 1, 1))])
}

// Left out of the copy: the months not kept, and the 12 weeks' read that the
// calendar replaced (step 4.6.9), which an older copy may still hold.
function isLeftOut(queryKey: readonly unknown[], months: Set<string>) {
  if (isWorkoutsRead(queryKey, 'recent')) return true
  return isWorkoutsRead(queryKey, 'month') && !months.has(String(queryKey[3]))
}

function isInfiniteData(data: unknown): data is { pages: unknown[]; pageParams: unknown[] } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'pages' in data &&
    'pageParams' in data &&
    Array.isArray(data.pages) &&
    Array.isArray(data.pageParams)
  )
}

// What is written to the copy: the dehydrated cache, with the history cut to its
// first page and only this month and the one before. Restored, the history has
// one page and "Ver mais" goes on from it.
export function trimForCopy<
  State extends { queries: { queryKey: readonly unknown[]; state: { data?: unknown } }[] },
>(clientState: State, now = new Date()): State {
  const months = keptMonths(now)
  return {
    ...clientState,
    queries: clientState.queries
      .filter((query) => !isLeftOut(query.queryKey, months))
      .map((query) => {
        const { data } = query.state
        if (!keepsFirstPageOnly(query.queryKey) || !isInfiniteData(data) || data.pages.length <= 1) return query
        return {
          ...query,
          state: { ...query.state, data: { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) } },
        }
      }),
  }
}

type StoredCopy ={ buster?: unknown; timestamp?: unknown; clientState?: { queries?: unknown } }

function parseCopy(raw: string | null): StoredCopy | null {
  if (!raw) return null
  try {
    const copy: unknown = JSON.parse(raw)
    return typeof copy === 'object' && copy !== null ? copy : null
  } catch {
    return null
  }
}

function countQueries(raw: string | null) {
  const queries = parseCopy(raw)?.clientState?.queries
  return Array.isArray(queries) ? queries.length : 0
}

// When a usable copy was saved, or null without one (none, damaged, another
// version or empty). Settings shows it, so readiness for the gym can be checked.
export function copySavedAt(raw: string | null) {
  const copy = parseCopy(raw)
  if (!copy || copy.buster !== QUERY_CACHE_BUSTER || typeof copy.timestamp !== 'number') return null
  return countQueries(raw) > 0 ? copy.timestamp : null
}

// The storage the copy is written through. A copy is only ever replaced by a
// better one:
// - not before it has been restored: until then the cache in memory does not
//   hold it yet, and saving would put an empty cache over it;
// - not with an empty cache over one that has data, whatever the reason;
// - not by another account: writes are delayed (throttled), so one can land
//   after a sign-out or an account change, and another account's data must not
//   come back.
export function copyStorage({
  storage,
  accountId,
  getCurrentAccountId,
  isRestored,
}: {
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  accountId: string
  getCurrentAccountId: () => string | null
  isRestored: () => boolean
}) {
  return {
    getItem: (key: string) => storage.getItem(key),
    setItem: (key: string, value: string) => {
      if (getCurrentAccountId() !== accountId || !isRestored()) return
      if (countQueries(value) === 0 && countQueries(storage.getItem(key)) > 0) return
      storage.setItem(key, value)
    },
    removeItem: (key: string) => storage.removeItem(key),
  }
}
