import { describe, expect, it } from 'vitest'
import { getSafeReturnPath } from '@/features/auth/lib/return-path'

const origin = 'http://localhost:5173'

describe('getSafeReturnPath', () => {
  it.each([
    ['/peso', '/peso'],
    ['/financas?mes=2026-10#resumo', '/financas?mes=2026-10#resumo'],
    ['/definicoes', '/definicoes'],
  ])('keeps the internal path %j', (value, expected) => {
    expect(getSafeReturnPath(value, origin)).toBe(expected)
  })

  it.each([
    ['missing', null],
    ['undefined', undefined],
    ['empty', ''],
    ['relative', 'peso'],
    ['leading space', ' /peso'],
  ])('falls back to / when the value is %s', (_label, value) => {
    expect(getSafeReturnPath(value, origin)).toBe('/')
  })

  it.each([
    ['protocol-relative URL', '//evil.com'],
    ['backslash after the slash', '/\\evil.com'],
    ['leading backslash', '\\evil.com'],
    ['absolute URL', 'https://evil.com'],
    ['javascript: URL', 'javascript:alert(1)'],
    ['tab the URL parser drops', '/\t/evil.com'],
    ['newline', '/peso\n'],
    ['dot segments resolving to //', '/..//evil.com'],
    ['single dot resolving to //', '/.//evil.com'],
  ])('refuses a %s: %j', (_label, value) => {
    expect(getSafeReturnPath(value, origin)).toBe('/')
  })

  it.each(['/entrar', '/entrar?next=/peso'])('refuses the sign-in page itself (%j), to avoid a loop', (value) => {
    expect(getSafeReturnPath(value, origin)).toBe('/')
  })

  it.each([
    ['an encoded newline', '/peso%0A'],
    ['encoded slashes', '/%2F%2Fevil.com'],
  ])('keeps %s as plain text in an internal path', (_label, value) => {
    // Encoded characters stay encoded: they cannot leave the app, and an
    // unknown path simply shows the 404 page.
    expect(getSafeReturnPath(value, origin)).toBe(value)
  })
})
