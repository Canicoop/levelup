import { describe, expect, it } from 'vitest'
import type { ActiveExercise, ActiveSet, ActiveWorkout } from '@/features/workout/lib/active-workout'
import { toSubmitPayload } from '@/features/workout/lib/workout-payload'

const logged = (weight: string, reps: string): ActiveSet => ({ weight, reps, done: true })
const open: ActiveSet = { weight: '40', reps: '8', done: false }

function exercise(exerciseId: string, sets: ActiveSet[], skipped = false): ActiveExercise {
  return { exerciseId, name: exerciseId, targetSets: 3, repMin: null, repMax: null, skipped, sets, lastSets: [] }
}

function workout(exercises: ActiveExercise[]): ActiveWorkout {
  return {
    id: 'workout-1',
    routineId: 'routine-1',
    routineName: 'Push',
    startedAt: '2026-11-03T18:00:00Z',
    lastSetsUnavailable: false,
    openExerciseId: null,
    exercises,
  }
}

const FINISHED = '2026-11-03T19:00:00Z'

describe('toSubmitPayload', () => {
  it('builds the payload of submit_workout, in order', () => {
    const payload = toSubmitPayload(
      workout([exercise('a', [logged('22,5', '10'), logged('25', '8')]), exercise('b', [logged('100', '5')])]),
      FINISHED,
    )
    expect(payload).toEqual({
      id: 'workout-1',
      routine_id: 'routine-1',
      started_at: '2026-11-03T18:00:00Z',
      finished_at: FINISHED,
      exercises: [
        {
          exercise_id: 'a',
          sets: [
            { weight_kg: '22.5', reps: 10 },
            { weight_kg: '25', reps: 8 },
          ],
        },
        { exercise_id: 'b', sets: [{ weight_kg: '100', reps: 5 }] },
      ],
    })
  })

  it('sends only the sets with ✓', () => {
    const payload = toSubmitPayload(workout([exercise('a', [open, logged('40', '8'), open])]), FINISHED)
    expect(payload?.exercises[0].sets).toEqual([{ weight_kg: '40', reps: 8 }])
  })

  it('leaves out skipped exercises, even with logged sets', () => {
    const payload = toSubmitPayload(
      workout([exercise('a', [logged('40', '8')], true), exercise('b', [logged('40', '8')])]),
      FINISHED,
    )
    expect(payload?.exercises.map((current) => current.exercise_id)).toEqual(['b'])
  })

  it('leaves out exercises with no logged sets', () => {
    const payload = toSubmitPayload(workout([exercise('a', [open]), exercise('b', [logged('40', '8')])]), FINISHED)
    expect(payload?.exercises.map((current) => current.exercise_id)).toEqual(['b'])
  })

  it('is null when nothing was logged', () => {
    expect(toSubmitPayload(workout([exercise('a', [open])]), FINISHED)).toBeNull()
    expect(toSubmitPayload(workout([exercise('a', [logged('40', '8')], true)]), FINISHED)).toBeNull()
    expect(toSubmitPayload(workout([]), FINISHED)).toBeNull()
  })
})
