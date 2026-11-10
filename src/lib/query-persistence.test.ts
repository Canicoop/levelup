import { describe, expect, it } from 'vitest'
import { accountStorage, queryCacheKey, shouldPersistQuery } from '@/lib/query-persistence'

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

describe('accountStorage', () => {
  function memory() {
    const values = new Map<string, string>()
    return {
      values,
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
      removeItem: (key: string) => void values.delete(key),
    }
  }

  it('writes while the account is the current one', () => {
    const storage = memory()
    accountStorage(storage, 'a', () => 'a').setItem('k', 'v')
    expect(storage.values.get('k')).toBe('v')
  })

  it('drops a late write after a sign-out or another account', () => {
    const storage = memory()
    accountStorage(storage, 'a', () => null).setItem('k', 'v')
    accountStorage(storage, 'a', () => 'b').setItem('k', 'v')
    expect(storage.values.has('k')).toBe(false)
  })

  it('reads and removes as usual', () => {
    const storage = memory()
    storage.setItem('k', 'v')
    const wrapped = accountStorage(storage, 'a', () => null)
    expect(wrapped.getItem('k')).toBe('v')
    wrapped.removeItem('k')
    expect(storage.values.has('k')).toBe(false)
  })
})
