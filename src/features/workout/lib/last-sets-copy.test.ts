import { describe, expect, it } from 'vitest'
import {
  lastSetsFromCopy,
  lastSetsFromPayload,
  mergeLastSetsCopy,
  overlayPendingLastSets,
  overlayPendingRoutineId,
  type LastSetsCopy,
} from '@/features/workout/lib/last-sets-copy'
import type { SubmitWorkoutPayload } from '@/features/workout/lib/workout-payload'

const bench = [{ weightKg: 80, reps: 8 }]
const squat = [{ weightKg: 100, reps: 5 }]
// "c" was asked for and has no history.
const copy: LastSetsCopy = { exerciseIds: ['a', 'b', 'c'], lastSets: { a: bench, b: squat } }

describe('lastSetsFromCopy', () => {
  it('gives the sets of exercises the copy covers', () => {
    expect(lastSetsFromCopy(copy, ['a', 'b'])).toEqual({ a: bench, b: squat })
  })

  it('treats a covered exercise with no entry as a first time', () => {
    expect(lastSetsFromCopy(copy, ['a', 'c'])).toEqual({ a: bench })
  })

  it('is null when an exercise was never asked for', () => {
    expect(lastSetsFromCopy(copy, ['a', 'd'])).toBeNull()
  })

  it('is null without a copy', () => {
    expect(lastSetsFromCopy(undefined, ['a'])).toBeNull()
  })

  it('is an empty record for no exercises', () => {
    expect(lastSetsFromCopy(copy, [])).toEqual({})
  })
})

describe('mergeLastSetsCopy', () => {
  it('starts a copy from a first read', () => {
    expect(mergeLastSetsCopy(undefined, ['a', 'c'], { a: bench })).toEqual({
      exerciseIds: ['a', 'c'],
      lastSets: { a: bench },
    })
  })

  it('replaces what it read and keeps the rest', () => {
    const newer = [{ weightKg: 85, reps: 6 }]
    expect(mergeLastSetsCopy(copy, ['a', 'd'], { a: newer, d: squat })).toEqual({
      exerciseIds: ['a', 'b', 'c', 'd'],
      lastSets: { a: newer, b: squat, d: squat },
    })
  })

  it('removes an entry the fresh read no longer has', () => {
    expect(mergeLastSetsCopy(copy, ['b'], {}).lastSets).toEqual({ a: bench })
  })
})

function payload(
  id: string,
  finishedAt: string,
  routineId: string,
  exercises: SubmitWorkoutPayload['exercises'],
): SubmitWorkoutPayload {
  return { id, routine_id: routineId, started_at: '2026-11-03T18:00:00.000Z', finished_at: finishedAt, exercises }
}

const monday = payload('w1', '2026-11-03T19:00:00.000Z', 'push', [
  { exercise_id: 'a', sets: [{ weight_kg: '82.5', reps: 8 }, { weight_kg: '82.5', reps: 7 }] },
  { exercise_id: 'b', sets: [{ weight_kg: '100', reps: 5 }] },
])
const tuesday = payload('w2', '2026-11-04T19:00:00.000Z', 'pull', [
  { exercise_id: 'a', sets: [{ weight_kg: '85', reps: 6 }] },
])

describe('lastSetsFromPayload', () => {
  it('gives the sets just done, per exercise, with the weight as a number', () => {
    expect(lastSetsFromPayload(monday)).toEqual({
      a: [
        { weightKg: 82.5, reps: 8 },
        { weightKg: 82.5, reps: 7 },
      ],
      b: [{ weightKg: 100, reps: 5 }],
    })
  })

  it('with the copy, replaces only the exercises sent', () => {
    const updated = mergeLastSetsCopy(copy, ['b'], lastSetsFromPayload(payload('w', '2026-11-03T19:00:00.000Z', 'r', [
      { exercise_id: 'b', sets: [{ weight_kg: '105', reps: 5 }] },
    ])))
    expect(updated.lastSets).toEqual({ a: bench, b: [{ weightKg: 105, reps: 5 }] })
  })
})

describe('overlayPendingLastSets', () => {
  it('lays the workouts waiting to be sent over an older read', () => {
    expect(overlayPendingLastSets({ a: bench, c: squat }, ['a', 'b', 'c'], [monday])).toEqual({
      a: [
        { weightKg: 82.5, reps: 8 },
        { weightKg: 82.5, reps: 7 },
      ],
      b: [{ weightKg: 100, reps: 5 }],
      c: squat,
    })
  })

  it('takes the latest waiting workout, in any order', () => {
    expect(overlayPendingLastSets({}, ['a'], [tuesday, monday]).a).toEqual([{ weightKg: 85, reps: 6 }])
  })

  it('leaves out exercises that were not asked for', () => {
    expect(overlayPendingLastSets({ a: bench }, ['a'], [monday])).not.toHaveProperty('b')
  })

  it('changes nothing with no workout waiting', () => {
    expect(overlayPendingLastSets({ a: bench }, ['a'], [])).toEqual({ a: bench })
  })
})

describe('overlayPendingRoutineId', () => {
  it('is the routine of the latest workout waiting to be sent', () => {
    expect(overlayPendingRoutineId('legs', [tuesday, monday])).toBe('pull')
  })

  it('is what the database says with no workout waiting', () => {
    expect(overlayPendingRoutineId('legs', [])).toBe('legs')
    expect(overlayPendingRoutineId(null, [])).toBeNull()
  })
})
