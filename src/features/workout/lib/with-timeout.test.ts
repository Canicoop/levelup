import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TimeoutError } from '@/features/workout/lib/errors'
import { withTimeout } from '@/features/workout/lib/with-timeout'

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('gives the result when the promise is in time', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000)).resolves.toBe('ok')
  })

  it('passes on the error of the promise', async () => {
    const error = new Error('failed')
    await expect(withTimeout(Promise.reject(error), 1000)).rejects.toBe(error)
  })

  it('rejects with TimeoutError when the promise takes too long', async () => {
    const result = withTimeout(new Promise(() => {}), 1000)
    const assertion = expect(result).rejects.toBeInstanceOf(TimeoutError)
    await vi.advanceTimersByTimeAsync(1000)
    await assertion
  })
})
