import { describe, expect, it } from 'vitest'
import type { ActiveWorkout } from '@/features/workout/lib/active-workout'
import {
  activeWorkoutKey,
  parseStoredWorkout,
  serializeWorkout,
} from '@/features/workout/lib/active-workout-storage'

const workout: ActiveWorkout = {
  id: 'workout-1',
  routineId: 'routine-1',
  routineName: 'Push',
  startedAt: '2026-11-03T18:00:00Z',
  lastSetsUnavailable: false,
  openExerciseId: 'a',
  exercises: [
    {
      exerciseId: 'a',
      name: 'Supino',
      targetSets: 2,
      repMin: 8,
      repMax: 12,
      skipped: false,
      sets: [
        { weight: '22,5', reps: '8', done: true },
        { weight: '22,', reps: '', done: false },
      ],
      lastSets: [{ weightKg: 22.5, reps: 10 }],
      lastSetsUnavailable: false,
    },
  ],
}

function stored(changes: object, version = 1) {
  return JSON.stringify({ version, workout: { ...workout, ...changes } })
}

describe('activeWorkoutKey', () => {
  it('is one key per account', () => {
    expect(activeWorkoutKey('user-1')).toBe('levelup:active-workout:user-1')
  })
})

describe('parseStoredWorkout', () => {
  it('reads a workout stored before exercises had lastSetsUnavailable, as false', () => {
    const older: Record<string, unknown> = { ...workout.exercises[0] }
    delete older.lastSetsUnavailable
    const parsed = parseStoredWorkout(stored({ exercises: [older] }))
    expect(parsed?.exercises[0].lastSetsUnavailable).toBe(false)
  })

  it('ignores a wrong lastSetsUnavailable on an exercise', () => {
    expect(parseStoredWorkout(stored({ exercises: [{ ...workout.exercises[0], lastSetsUnavailable: 'no' }] }))).toBeNull()
  })

  it('reads back what was saved, unfinished values included', () => {
    expect(parseStoredWorkout(serializeWorkout(workout))).toEqual(workout)
  })

  it('accepts no open exercise and no rep range', () => {
    const exercises = [{ ...workout.exercises[0], repMin: null, repMax: null }]
    expect(parseStoredWorkout(stored({ openExerciseId: null, exercises }))?.openExerciseId).toBeNull()
  })

  it.each([
    ['nothing stored', null],
    ['text that is not JSON', '{oops'],
    ['an empty string', ''],
    ['a value that is not an object', '42'],
    ['null', 'null'],
    ['no version', JSON.stringify({ workout })],
    ['another version', stored({}, 2)],
    ['no workout', '{"version":1}'],
    ['a missing id', stored({ id: undefined })],
    ['a wrong started date', stored({ startedAt: 1 })],
    ['a missing network flag', stored({ lastSetsUnavailable: undefined })],
    ['an exercise without a goal', stored({ exercises: [{ ...workout.exercises[0], targetSets: undefined }] })],
    ['exercises that are not a list', stored({ exercises: {} })],
    ['an exercise without sets', stored({ exercises: [{ ...workout.exercises[0], sets: undefined }] })],
    ['a set with a wrong field', stored({ exercises: [{ ...workout.exercises[0], sets: [{ weight: 1, reps: '', done: false }] }] })],
    ['a wrong last set', stored({ exercises: [{ ...workout.exercises[0], lastSets: [{ weightKg: '1', reps: 1 }] }] })],
  ])('ignores %s', (_label, raw) => {
    expect(parseStoredWorkout(raw)).toBeNull()
  })

  it.each([
    ['weight', { weight: '22,', reps: '8', done: true }],
    ['reps', { weight: '40', reps: '', done: true }],
  ])('ignores a logged set with an invalid %s', (_field, set) => {
    expect(parseStoredWorkout(stored({ exercises: [{ ...workout.exercises[0], sets: [set] }] }))).toBeNull()
  })
})
