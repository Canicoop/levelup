import { describe, expect, it } from 'vitest'
import { parseStoredUserId, storedSessionKey } from '@/features/auth/lib/stored-session'

describe('storedSessionKey', () => {
  it('uses the first part of the host, like the Supabase client', () => {
    expect(storedSessionKey('https://abcdefgh.supabase.co')).toBe('sb-abcdefgh-auth-token')
  })
})

describe('parseStoredUserId', () => {
  it('reads the account from a stored session', () => {
    expect(parseStoredUserId(JSON.stringify({ access_token: 'x', user: { id: 'user-1' } }))).toBe('user-1')
  })

  it.each([
    ['nothing stored', null],
    ['text that is not JSON', 'not json'],
    ['JSON that is not an object', '42'],
    ['null', 'null'],
    ['no user', '{"access_token":"x"}'],
    ['a null user', '{"user":null}'],
    ['a user without an id', '{"user":{}}'],
    ['an id that is not text', '{"user":{"id":1}}'],
  ])('is null for %s', (_label, raw) => {
    expect(parseStoredUserId(raw)).toBeNull()
  })
})
