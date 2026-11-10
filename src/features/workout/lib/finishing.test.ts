import { describe, expect, it } from 'vitest'
import type { ActiveExercise, ActiveSet, ActiveWorkout } from '@/features/workout/lib/active-workout'
import { finishCounts, finishTime, lastLoggedAt } from '@/features/workout/lib/finishing'

const START = '2026-11-03T18:00:00.000Z'

function at(minutes: number) {
  return new Date(Date.parse(START) + minutes * 60_000).toISOString()
}

const logged = (minutes?: number): ActiveSet =>
  minutes === undefined ? { weight: '40', reps: '8', done: true } : { weight: '40', reps: '8', done: true, doneAt: at(minutes) }
const open: ActiveSet = { weight: '40', reps: '', done: false }

function exercise(exerciseId: string, sets: ActiveSet[], skipped = false): ActiveExercise {
  return {
    exerciseId,
    name: exerciseId,
    targetSets: sets.length,
    repMin: null,
    repMax: null,
    skipped,
    sets,
    lastSets: [],
    lastSetsUnavailable: false,
  }
}

function workout(exercises: ActiveExercise[]): ActiveWorkout {
  return {
    id: 'workout-1',
    routineId: 'routine-1',
    routineName: 'Push',
    startedAt: START,
    lastSetsUnavailable: false,
    openExerciseId: null,
    exercises,
  }
}

describe('lastLoggedAt', () => {
  it('is the latest logged set, in any exercise', () => {
    const value = workout([exercise('a', [logged(10), logged(50)]), exercise('b', [logged(30)])])
    expect(lastLoggedAt(value)).toBe(Date.parse(at(50)))
  })

  it('leaves out sets without ✓ and skipped exercises', () => {
    const skipped = exercise('b', [{ ...logged(90) }], true)
    const value = workout([exercise('a', [logged(10), { ...open, doneAt: at(80) }]), skipped])
    expect(lastLoggedAt(value)).toBe(Date.parse(at(10)))
  })

  it('is null when no set has a time', () => {
    expect(lastLoggedAt(workout([exercise('a', [logged(), open])]))).toBeNull()
  })

  it('uses the times there are when only some sets have one', () => {
    expect(lastLoggedAt(workout([exercise('a', [logged(20), logged()])]))).toBe(Date.parse(at(20)))
  })
})

describe('finishTime', () => {
  const value = workout([exercise('a', [logged(10), logged(45)])])

  it('finishes now when the last set was recent', () => {
    expect(finishTime(value, at(60))).toEqual({ finishedAt: at(60), reason: 'now' })
  })

  it('finishes now when the last set was exactly an hour ago', () => {
    expect(finishTime(value, at(105))).toEqual({ finishedAt: at(105), reason: 'now' })
  })

  it('finishes at the last set when it was more than an hour ago', () => {
    expect(finishTime(value, at(106))).toEqual({ finishedAt: at(45), reason: 'last-set' })
  })

  it('finishes now for a workout stored before sets had a time', () => {
    expect(finishTime(workout([exercise('a', [logged()])]), at(600))).toEqual({ finishedAt: at(600), reason: 'now' })
  })

  it('finishes 24 hours after the start when even the last set is later', () => {
    const nextDay = workout([exercise('a', [logged(10)]), exercise('b', [logged(25 * 60)])])
    expect(finishTime(nextDay, at(27 * 60))).toEqual({ finishedAt: at(24 * 60), reason: 'limit' })
  })

  it('finishes 24 hours after the start without times either', () => {
    expect(finishTime(workout([exercise('a', [logged()])]), at(30 * 60))).toEqual({
      finishedAt: at(24 * 60),
      reason: 'limit',
    })
  })

  it('accepts exactly 24 hours', () => {
    const late = workout([exercise('a', [logged(24 * 60)])])
    expect(finishTime(late, at(24 * 60))).toEqual({ finishedAt: at(24 * 60), reason: 'now' })
  })

  it('never finishes before the start, when the clock went back', () => {
    expect(finishTime(value, at(-30))).toEqual({ finishedAt: START, reason: 'now' })
  })

  it('never finishes before the start, when a set has a time before it', () => {
    const early = workout([exercise('a', [logged(-120)])])
    expect(finishTime(early, at(10))).toEqual({ finishedAt: START, reason: 'now' })
  })
})

describe('finishCounts', () => {
  it('counts the logged and missing sets, leaving out skipped exercises', () => {
    const value = workout([
      exercise('a', [logged(1), logged(2), open]),
      exercise('b', [open, open], true),
      exercise('c', [logged(3), open]),
    ])
    expect(finishCounts(value)).toEqual({ logged: 3, missing: 2 })
  })

  it('is zero logged when nothing was logged', () => {
    expect(finishCounts(workout([exercise('a', [open])]))).toEqual({ logged: 0, missing: 1 })
  })
})
