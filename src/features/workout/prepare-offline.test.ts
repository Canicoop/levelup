import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { workoutKeys } from '@/features/workout/api/query-keys'
import { prepareWorkoutOffline } from '@/features/workout/prepare-offline'

// The one test with mocks (see Unit tests in docs/decisions.md): what is under
// test is the order of an await and a cache write across an account change,
// which no pure function holds. The reads and the account are replaced; the
// cache is a real QueryClient.

let account: string | null = 'account-a'
vi.mock('@/features/auth/account', () => ({ getAccountId: () => account }))

const reads = vi.hoisted(() => ({
  routines: vi.fn(),
  lastSets: vi.fn(),
  saveLastSetsCopy: vi.fn(),
}))

vi.mock('@/features/workout/api/routines', () => ({
  fetchRoutines: () => Promise.resolve([]),
  fetchActiveRoutinesWithExercises: reads.routines,
}))
vi.mock('@/features/workout/api/exercises', () => ({ fetchExercises: () => Promise.resolve([]) }))
vi.mock('@/features/workout/api/workouts', () => ({
  fetchLastRoutineId: () => Promise.resolve(null),
  fetchLastSets: reads.lastSets,
  saveLastSetsCopy: reads.saveLastSetsCopy,
}))
vi.mock('@/features/workout/api/history', () => ({
  monthWorkoutsOptions: (month: string) => ({ queryKey: ['workout', 'workouts', 'month', month], queryFn: () => [] }),
  firstWorkoutMonthOptions: () => ({ queryKey: ['workout', 'workouts', 'first-month'], queryFn: () => null }),
  historyOptions: () => ({
    queryKey: ['workout', 'workouts', 'history'],
    queryFn: () => ({ records: [], next: null }),
    initialPageParam: null,
    getNextPageParam: () => null,
  }),
}))

const routine = { id: 'routine-1', name: 'Push', exercises: [{ exercise_id: 'exercise-1' }] }
const lastSets = { 'exercise-1': [{ weightKg: 60, reps: 8 }] }

// A read that answers only when told to, so the account can change while it waits.
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => (resolve = done))
  return { promise, resolve }
}

describe('prepareWorkoutOffline across an account change', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    account = 'account-a'
    queryClient = new QueryClient()
    reads.routines.mockReset()
    reads.lastSets.mockReset()
    reads.saveLastSetsCopy.mockReset()
  })

  it('writes the routines and "Última vez" for the account that asked', async () => {
    reads.routines.mockResolvedValue([routine])
    reads.lastSets.mockResolvedValue(lastSets)
    await prepareWorkoutOffline(queryClient)
    expect(queryClient.getQueryData(workoutKeys.routine('routine-1'))).toEqual(routine)
    expect(reads.saveLastSetsCopy).toHaveBeenCalledWith(queryClient, ['exercise-1'], lastSets)
  })

  it('writes nothing when the account changes while the routines are read', async () => {
    const answer = deferred<(typeof routine)[]>()
    reads.routines.mockReturnValue(answer.promise)
    const preparing = prepareWorkoutOffline(queryClient)
    account = 'account-b'
    answer.resolve([routine])
    await preparing
    expect(queryClient.getQueryData(workoutKeys.routine('routine-1'))).toBeUndefined()
    expect(reads.lastSets).not.toHaveBeenCalled()
    expect(reads.saveLastSetsCopy).not.toHaveBeenCalled()
  })

  it('keeps "Última vez" out when the account changes while it is read', async () => {
    reads.routines.mockResolvedValue([routine])
    const answer = deferred<typeof lastSets>()
    reads.lastSets.mockReturnValue(answer.promise)
    const preparing = prepareWorkoutOffline(queryClient)
    await vi.waitFor(() => expect(reads.lastSets).toHaveBeenCalled())
    account = null
    answer.resolve(lastSets)
    await preparing
    expect(reads.saveLastSetsCopy).not.toHaveBeenCalled()
  })
})
