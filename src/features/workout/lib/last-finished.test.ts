import { describe, expect, it } from 'vitest'
import { lastFinishedKey, parseLastFinished, serializeLastFinished } from '@/features/workout/lib/last-finished'
import type { PendingWorkout } from '@/features/workout/lib/pending-workouts'

const workout: PendingWorkout = {
  payload: {
    id: 'w1',
    routine_id: 'r1',
    started_at: '2026-11-03T18:00:00.000Z',
    finished_at: '2026-11-03T19:00:00.000Z',
    exercises: [{ exercise_id: 'a', sets: [{ weight_kg: '80', reps: 8 }] }],
  },
  routineName: 'Push',
  exerciseNames: { a: 'Supino Barra' },
}

describe('lastFinishedKey', () => {
  it('is one key per account', () => {
    expect(lastFinishedKey('user-1')).toBe('levelup:last-finished:user-1')
  })
})

describe('parseLastFinished', () => {
  it('reads back what was saved', () => {
    expect(parseLastFinished(serializeLastFinished(workout))).toEqual(workout)
  })

  it.each([
    ['nothing stored', null],
    ['text that is not JSON', '{oops'],
    ['null', 'null'],
    ['a number', '42'],
    ['no version', JSON.stringify({ workout })],
    ['another version', JSON.stringify({ version: 2, workout })],
    ['no workout', '{"version":1}'],
    ['a damaged workout', JSON.stringify({ version: 1, workout: { ...workout, routineName: 1 } })],
  ])('ignores %s', (_label, raw) => {
    expect(parseLastFinished(raw)).toBeNull()
  })
})
