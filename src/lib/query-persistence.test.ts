import { describe, expect, it } from 'vitest'
import {
  QUERY_CACHE_BUSTER,
  copySavedAt,
  copyStorage,
  queryCacheKey,
  shouldPersistQuery,
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
