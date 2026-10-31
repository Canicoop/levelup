import { describe, expect, it } from 'vitest'
import { readRedirectResult } from '@/features/auth/lib/sign-in-error'

describe('readRedirectResult', () => {
  it('finds nothing on a plain visit', () => {
    expect(readRedirectResult('', '')).toEqual({ error: null, description: null, hasCode: false })
  })

  it('detects the code of a successful sign-in', () => {
    expect(readRedirectResult('?code=abc123', '')).toEqual({ error: null, description: null, hasCode: true })
  })

  it('treats access_denied as a cancelled sign-in', () => {
    expect(readRedirectResult('?error=access_denied&error_description=The+user+denied+access', '')).toEqual({
      error: 'cancelled',
      description: 'The user denied access',
      hasCode: false,
    })
  })

  it('treats any other error as a failed sign-in, keeping the description', () => {
    expect(readRedirectResult('?error=server_error&error_description=Unable+to+exchange+external+code', '')).toEqual({
      error: 'failed',
      description: 'Unable to exchange external code',
      hasCode: false,
    })
  })

  it('reads an error from the hash', () => {
    expect(readRedirectResult('', '#error=access_denied&error_description=Denied').error).toBe('cancelled')
    expect(readRedirectResult('', '#error=server_error').error).toBe('failed')
  })

  it('prefers the query string when both carry the same parameter', () => {
    expect(readRedirectResult('?error=access_denied', '#error=server_error').error).toBe('cancelled')
  })
})
