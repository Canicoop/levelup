import { describe, expect, it } from 'vitest'
import { TimeoutError } from '@/features/workout/lib/errors'
import {
  addPendingWorkout,
  classifySubmitError,
  clearPendingRejected,
  markPendingRejected,
  parsePendingWorkouts,
  pendingWorkoutsKey,
  removePendingWorkout,
  sendablePendingWorkouts,
  serializePendingWorkouts,
  type PendingWorkout,
} from '@/features/workout/lib/pending-workouts'

function pending(id: string, finishedAt = '2026-11-03T19:00:00.000Z'): PendingWorkout {
  return {
    payload: {
      id,
      routine_id: 'routine-1',
      started_at: '2026-11-03T18:00:00.000Z',
      finished_at: finishedAt,
      exercises: [{ exercise_id: 'a', sets: [{ weight_kg: '22.5', reps: 8 }] }],
    },
    routineName: 'Push',
    exerciseNames: { a: 'Supino' },
  }
}

function stored(workouts: unknown[], version = 1) {
  return JSON.stringify({ version, workouts })
}

describe('pendingWorkoutsKey', () => {
  it('is one key per account', () => {
    expect(pendingWorkoutsKey('user-1')).toBe('levelup:pending-workouts:user-1')
  })
})

describe('parsePendingWorkouts', () => {
  it('reads back what was saved, a refused workout included', () => {
    const workouts = [pending('w1'), { ...pending('w2'), rejected: { code: '23514', at: '2026-11-03T19:05:00.000Z' } }]
    expect(parsePendingWorkouts(serializePendingWorkouts(workouts))).toEqual(workouts)
  })

  it.each([
    ['nothing stored', null],
    ['text that is not JSON', '{oops'],
    ['an empty string', ''],
    ['null', 'null'],
    ['no version', JSON.stringify({ workouts: [pending('w1')] })],
    ['another version', stored([pending('w1')], 2)],
    ['a list that is not a list', JSON.stringify({ version: 1, workouts: {} })],
  ])('reads %s as an empty queue', (_label, raw) => {
    expect(parsePendingWorkouts(raw)).toEqual([])
  })

  const base = pending('bad')
  it.each([
    ['no payload', { ...base, payload: undefined }],
    ['a missing id', { ...base, payload: { ...base.payload, id: 1 } }],
    ['a wrong finish date', { ...base, payload: { ...base.payload, finished_at: 'later' } }],
    ['no exercises', { ...base, payload: { ...base.payload, exercises: [] } }],
    ['an exercise without sets', { ...base, payload: { ...base.payload, exercises: [{ exercise_id: 'a', sets: [] }] } }],
    [
      'a weight as a number',
      { ...base, payload: { ...base.payload, exercises: [{ exercise_id: 'a', sets: [{ weight_kg: 22.5, reps: 8 }] }] } },
    ],
    [
      'reps that are not whole',
      { ...base, payload: { ...base.payload, exercises: [{ exercise_id: 'a', sets: [{ weight_kg: '22.5', reps: 8.5 }] }] } },
    ],
    ['no routine name', { ...base, routineName: undefined }],
    ['wrong exercise names', { ...base, exerciseNames: { a: 1 } }],
    ['a wrong refusal', { ...base, rejected: { code: 23514 } }],
  ])('drops a workout with %s and keeps the others', (_label, damaged) => {
    expect(parsePendingWorkouts(stored([pending('w1'), damaged, pending('w2')]))).toEqual([pending('w1'), pending('w2')])
  })
})

describe('addPendingWorkout', () => {
  it('adds at the end', () => {
    expect(addPendingWorkout([pending('w1')], pending('w2'))).toEqual([pending('w1'), pending('w2')])
  })

  it('replaces a workout with the same id instead of queueing it twice', () => {
    const again = { ...pending('w1'), routineName: 'Pull' }
    expect(addPendingWorkout([pending('w1'), pending('w2')], again)).toEqual([again, pending('w2')])
  })
})

describe('removePendingWorkout', () => {
  it('removes only that workout', () => {
    expect(removePendingWorkout([pending('w1'), pending('w2')], 'w1')).toEqual([pending('w2')])
  })

  it('changes nothing for an unknown id', () => {
    expect(removePendingWorkout([pending('w1')], 'x')).toEqual([pending('w1')])
  })
})

describe('markPendingRejected and clearPendingRejected', () => {
  const at = '2026-11-03T19:05:00.000Z'

  it('marks only that workout, and clearing makes it sendable again', () => {
    const marked = markPendingRejected([pending('w1'), pending('w2')], 'w1', '23514', at)
    expect(marked[0].rejected).toEqual({ code: '23514', at })
    expect(marked[1].rejected).toBeUndefined()
    expect(sendablePendingWorkouts(marked).map((w) => w.payload.id)).toEqual(['w2'])

    const cleared = clearPendingRejected(marked, 'w1')
    expect(cleared[0]).toStrictEqual(pending('w1'))
    expect(sendablePendingWorkouts(cleared)).toHaveLength(2)
  })
})

describe('sendablePendingWorkouts', () => {
  it('sends the oldest first', () => {
    const later = pending('later', '2026-11-04T19:00:00.000Z')
    const earlier = pending('earlier', '2026-11-02T19:00:00.000Z')
    expect(sendablePendingWorkouts([later, earlier]).map((w) => w.payload.id)).toEqual(['earlier', 'later'])
  })
})

describe('classifySubmitError', () => {
  it.each([
    ['no network (Chrome)', new TypeError('Failed to fetch'), null],
    ['no network (Safari)', { message: 'TypeError: Load failed', code: '' }, 0],
    ['a request that took too long', new TimeoutError(), null],
    ['a server error', { message: 'Internal error', code: '' }, 500],
    ['a gateway timeout', { message: 'upstream timeout', code: '' }, 504],
    ['an unknown code', { message: 'Something', code: 'XX000' }, 500],
  ])('retries after %s', (_label, error, status) => {
    expect(classifySubmitError(error, status)).toEqual({ kind: 'retry' })
  })

  it.each([
    ['an expired JWT (PGRST301)', { message: 'JWT expired', code: 'PGRST301' }, 401],
    ['PGRST301 without a status', { message: 'JWT expired', code: 'PGRST301' }, null],
    ['an invalid JWT (PGRST303)', { message: 'JWT claims check failed', code: 'PGRST303' }, 401],
    ['a JWT message with no code', { message: 'JWT expired', code: '' }, null],
    ['a 401 with no code', { message: 'Unauthorized', code: '' }, 401],
    // No session: the call runs as anon, which may not run the function.
    ['a permission code (42501) with 401', { message: 'permission denied for function submit_workout', code: '42501' }, 401],
    ['a refused code with 401', { message: 'new row violates row-level security policy', code: '23514' }, 401],
  ])('always retries an expired or missing session: %s', (_label, error, status) => {
    expect(classifySubmitError(error, status)).toEqual({ kind: 'retry' })
  })

  it.each([
    ['22023', 400],
    ['23514', 400],
    ['23505', 409],
    ['23503', 409],
    ['23502', 400],
    ['22P02', 400],
    ['22007', 400],
    ['42501', 403],
  ])('marks %s as refused', (code, status) => {
    expect(classifySubmitError({ message: 'refused', code }, status)).toEqual({ kind: 'rejected', code })
  })
})
