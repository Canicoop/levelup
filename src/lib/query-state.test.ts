import { describe, expect, it } from 'vitest'
import { isWaitingForNetwork } from '@/lib/query-state'

describe('isWaitingForNetwork', () => {
  it('is true for a read with no data, paused without network', () => {
    expect(isWaitingForNetwork({ isPending: true, fetchStatus: 'paused' })).toBe(true)
  })

  it('is false while the read is running: that is the skeleton', () => {
    expect(isWaitingForNetwork({ isPending: true, fetchStatus: 'fetching' })).toBe(false)
  })

  it('is false with data in the cache, even if a refetch is paused', () => {
    expect(isWaitingForNetwork({ isPending: false, fetchStatus: 'paused' })).toBe(false)
  })

  it('is false for a read that has finished', () => {
    expect(isWaitingForNetwork({ isPending: false, fetchStatus: 'idle' })).toBe(false)
  })
})
