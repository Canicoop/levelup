import { TimeoutError } from '@/features/workout/lib/errors'

// Rejects with TimeoutError if the promise takes longer than `ms`. A weak gym
// connection can leave a request hanging instead of failing.
export function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new TimeoutError()), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}
