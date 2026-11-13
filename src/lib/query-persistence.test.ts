import { describe, expect, it } from 'vitest'
import {
  QUERY_CACHE_BUSTER,
  copySavedAt,
  copyStorage,
  queryCacheKey,
  shouldPersistQuery,
  trimForCopy,
} from '@/lib/query-persistence'

describe('queryCacheKey', () => {
  it('is one key per account', () => {
    expect(queryCacheKey('user-1')).toBe('levelup:query-cache:user-1')
  })
})

describe('shouldPersistQuery', () => {
  it('keeps finished Workout reads', () => {
    expect(shouldPersistQuery({ queryKey: ['workout', 'routines'], state: { status: 'success' } })).toBe(true)
  })

  it.each(['pending', 'error'])('does not keep a %s read', (status) => {
    expect(shouldPersistQuery({ queryKey: ['workout', 'routines'], state: { status } })).toBe(false)
  })

  it('does not keep reads of other modules', () => {
    expect(shouldPersistQuery({ queryKey: ['weight'], state: { status: 'success' } })).toBe(false)
  })

  it('keeps the history and the months', () => {
    expect(shouldPersistQuery({ queryKey: ['workout', 'workouts', 'history'], state: { status: 'success' } })).toBe(true)
    expect(shouldPersistQuery({ queryKey: ['workout', 'workouts', 'month', '2026-11'], state: { status: 'success' } })).toBe(
      true,
    )
  })
})

describe('trimForCopy', () => {
  const history = (pages: number) => ({
    queryKey: ['workout', 'workouts', 'history'],
    state: {
      status: 'success',
      data: {
        pages: Array.from({ length: pages }, (_, page) => ({ records: [`page ${page}`] })),
        pageParams: Array.from({ length: pages }, (_, page) => (page === 0 ? null : `cursor ${page}`)),
      },
    },
  })

  it('keeps only the first page of the history', () => {
    const [trimmed] = trimForCopy({ queries: [history(3)] }).queries
    expect(trimmed.state.data).toEqual({ pages: [{ records: ['page 0'] }], pageParams: [null] })
    expect(trimmed.state.status).toBe('success')
  })

  it('leaves a history of one page, and every other read, as they are', () => {
    const routines = { queryKey: ['workout', 'routines'], state: { data: { pages: [1, 2], pageParams: [1, 2] } } }
    const first = { queryKey: ['workout', 'workouts', 'first-month'], state: { data: '2026-03' } }
    const one = history(1)
    const state = { mutations: [], queries: [one, routines, first] }
    const trimmed = trimForCopy(state)
    expect(trimmed.queries[0]).toBe(one)
    expect(trimmed.queries[1]).toBe(routines)
    expect(trimmed.queries[2]).toBe(first)
    expect(trimmed.mutations).toBe(state.mutations)
  })

  const month = (key: string) => ({ queryKey: ['workout', 'workouts', 'month', key], state: { data: [] } })

  it('keeps only this month and the one before', () => {
    const queries = [month('2026-11'), month('2026-10'), month('2026-09'), month('2025-11')]
    const kept = trimForCopy({ queries }, new Date(2026, 10, 11)).queries.map((query) => query.queryKey[3])
    expect(kept).toEqual(['2026-11', '2026-10'])
  })

  it('reaches back into the year before in January', () => {
    const queries = [month('2027-01'), month('2026-12'), month('2026-11')]
    const kept = trimForCopy({ queries }, new Date(2027, 0, 1, 0, 30)).queries.map((query) => query.queryKey[3])
    expect(kept).toEqual(['2027-01', '2026-12'])
  })

  it('drops the 12 weeks read that the calendar replaced', () => {
    const recent = { queryKey: ['workout', 'workouts', 'recent'], state: { data: [{ id: 'w1' }] } }
    expect(trimForCopy({ queries: [recent, history(1)] }).queries).toHaveLength(1)
  })

  it('does not change the cache in memory', () => {
    const query = history(2)
    trimForCopy({ queries: [query] })
    expect(query.state.data.pages).toHaveLength(2)
  })
})

function copyWith(queries: number, timestamp = 1000, buster = QUERY_CACHE_BUSTER) {
  return JSON.stringify({
    buster,
    timestamp,
    clientState: { mutations: [], queries: Array.from({ length: queries }, (_, index) => ({ queryKey: ['workout', index] })) },
  })
}

describe('copyStorage', () => {
  function setup({ account = 'a', current = 'a' as string | null, restored = true, stored = null as string | null } = {}) {
    const values = new Map<string, string>()
    if (stored !== null) values.set('k', stored)
    const memory = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
      removeItem: (key: string) => void values.delete(key),
    }
    const storage = copyStorage({ storage: memory, accountId: account, getCurrentAccountId: () => current, isRestored: () => restored })
    return { storage, values }
  }

  it('writes a copy for the current account once restored', () => {
    const { storage, values } = setup()
    storage.setItem('k', copyWith(2))
    expect(values.get('k')).toBe(copyWith(2))
  })

  it('writes nothing before the copy has been restored, so it cannot be overwritten', () => {
    const { storage, values } = setup({ restored: false, stored: copyWith(3) })
    storage.setItem('k', copyWith(0))
    storage.setItem('k', copyWith(1))
    expect(values.get('k')).toBe(copyWith(3))
  })

  it('never puts an empty cache over a copy with data', () => {
    const { storage, values } = setup({ stored: copyWith(3) })
    storage.setItem('k', copyWith(0))
    expect(values.get('k')).toBe(copyWith(3))
  })

  it('replaces a copy with a newer one that has data', () => {
    const { storage, values } = setup({ stored: copyWith(3) })
    storage.setItem('k', copyWith(4, 2000))
    expect(values.get('k')).toBe(copyWith(4, 2000))
  })

  it('writes an empty cache when there is nothing to lose', () => {
    const { storage, values } = setup()
    storage.setItem('k', copyWith(0))
    expect(values.get('k')).toBe(copyWith(0))
  })

  it('drops a late write after a sign-out or another account', () => {
    const signedOut = setup({ current: null })
    signedOut.storage.setItem('k', copyWith(1))
    expect(signedOut.values.has('k')).toBe(false)
    const other = setup({ current: 'b' })
    other.storage.setItem('k', copyWith(1))
    expect(other.values.has('k')).toBe(false)
  })

  it('reads and removes as usual', () => {
    const { storage, values } = setup({ current: null, stored: copyWith(1) })
    expect(storage.getItem('k')).toBe(copyWith(1))
    storage.removeItem('k')
    expect(values.has('k')).toBe(false)
  })
})

describe('copySavedAt', () => {
  it('is when a usable copy was saved', () => {
    expect(copySavedAt(copyWith(2, 1234))).toBe(1234)
  })

  it.each([
    ['nothing stored', null],
    ['text that is not JSON', '{oops'],
    ['an empty copy', copyWith(0)],
    ['another version', copyWith(2, 1234, 'old')],
    ['no timestamp', JSON.stringify({ buster: QUERY_CACHE_BUSTER, clientState: { queries: [{}] } })],
  ])('is null for %s', (_label, raw) => {
    expect(copySavedAt(raw)).toBeNull()
  })
})
