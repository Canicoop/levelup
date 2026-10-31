import type { User } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { getUserProfile } from '@/features/auth/lib/user-profile'

// A made-up user with only the fields the Supabase type requires. Pass null
// for a user without an email (undefined would take the default).
function user(metadata: Record<string, unknown>, email: string | null = 'ana.teste@example.com'): User {
  return {
    id: 'test-user',
    aud: 'authenticated',
    app_metadata: {},
    created_at: '2026-10-30T00:00:00Z',
    user_metadata: metadata,
    email: email ?? undefined,
  }
}

describe('getUserProfile', () => {
  it('reads the name, first name, initial, email and photo', () => {
    expect(getUserProfile(user({ full_name: 'Ana Teste', avatar_url: 'https://example.com/a.png' }))).toEqual({
      name: 'Ana Teste',
      firstName: 'Ana',
      initial: 'A',
      email: 'ana.teste@example.com',
      avatarUrl: 'https://example.com/a.png',
    })
  })

  it('falls back to name and picture', () => {
    const profile = getUserProfile(user({ name: 'Bruno Costa Silva', picture: 'https://example.com/b.png' }))
    expect(profile.name).toBe('Bruno Costa Silva')
    expect(profile.firstName).toBe('Bruno')
    expect(profile.avatarUrl).toBe('https://example.com/b.png')
  })

  it('trims extra spaces around and inside the name', () => {
    const profile = getUserProfile(user({ full_name: '   ana   teste  ' }))
    expect(profile.name).toBe('ana   teste')
    expect(profile.firstName).toBe('ana')
    expect(profile.initial).toBe('A')
  })

  it('upper-cases an accented initial', () => {
    expect(getUserProfile(user({ full_name: 'élio Martins' })).initial).toBe('É')
  })

  it('ignores names that are not text', () => {
    const profile = getUserProfile(user({ full_name: 42, name: ['x'] }))
    expect(profile.name).toBeNull()
    expect(profile.firstName).toBeNull()
    expect(profile.initial).toBeNull()
  })

  it.each([
    ['http', { avatar_url: 'http://example.com/a.png' }],
    ['javascript:', { avatar_url: 'javascript:alert(1)' }],
    ['empty', { avatar_url: '' }],
    ['not a URL', { avatar_url: 'foto.png' }],
  ])('only accepts photos over https (refuses %s)', (_label, metadata) => {
    expect(getUserProfile(user({ full_name: 'Ana', ...metadata })).avatarUrl).toBeNull()
  })

  it('uses picture when avatar_url is empty', () => {
    expect(
      getUserProfile(user({ full_name: 'Ana', avatar_url: '', picture: 'https://example.com/p.png' })).avatarUrl,
    ).toBe('https://example.com/p.png')
  })

  it('returns only nulls without a user, or without metadata and email', () => {
    const empty = { name: null, firstName: null, initial: null, email: null, avatarUrl: null }
    expect(getUserProfile(null)).toEqual(empty)
    expect(getUserProfile(user({}, null))).toEqual(empty)
  })
})
