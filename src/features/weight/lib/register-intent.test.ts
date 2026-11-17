import { describe, expect, it } from 'vitest'
import { REGISTER_INTENT, wantsRegister } from '@/features/weight/lib/register-intent'

describe('wantsRegister', () => {
  it('recognises the request Home sends', () => {
    expect(wantsRegister(REGISTER_INTENT)).toBe(true)
  })

  it('ignores no state, or one cleared after use', () => {
    expect(wantsRegister(undefined)).toBe(false)
    expect(wantsRegister(null)).toBe(false)
  })

  it('ignores any other state', () => {
    expect(wantsRegister({ register: 'true' })).toBe(false)
    expect(wantsRegister({ from: '/treino' })).toBe(false)
    expect(wantsRegister('register')).toBe(false)
  })
})
