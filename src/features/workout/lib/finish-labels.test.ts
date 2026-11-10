import { describe, expect, it } from 'vitest'
import {
  countWorkoutSets,
  formatClock,
  formatDuration,
  formatExerciseSets,
  formatFinishCounts,
  formatFinishNote,
  formatRejectedCount,
  formatSetCount,
  formatWaitingCount,
  formatWorkoutLabel,
  sendState,
  summarizeWorkout,
} from '@/features/workout/lib/finish-labels'
import type { PendingWorkout } from '@/features/workout/lib/pending-workouts'

const MINUTE = 60_000

const workout: PendingWorkout = {
  payload: {
    id: 'w1',
    routine_id: 'r1',
    started_at: '2026-11-03T18:00:00.000Z',
    finished_at: '2026-11-03T19:05:30.000Z',
    exercises: [
      {
        exercise_id: 'a',
        sets: [
          { weight_kg: '80', reps: 8 },
          { weight_kg: '80', reps: 8 },
          { weight_kg: '80', reps: 7 },
        ],
      },
      { exercise_id: 'b', sets: [{ weight_kg: '20', reps: 12 }] },
    ],
  },
  routineName: 'Push',
  exerciseNames: { a: 'Supino Barra', b: 'Elevação lateral' },
}

describe('formatSetCount', () => {
  it('uses the singular for one set', () => {
    expect(formatSetCount(1)).toBe('1 série')
    expect(formatSetCount(3)).toBe('3 séries')
  })
})

describe('formatFinishCounts', () => {
  it.each([
    [{ logged: 15, missing: 3 }, '15 séries registadas. Faltam 3, que não são guardadas.'],
    [{ logged: 15, missing: 1 }, '15 séries registadas. Falta 1, que não é guardada.'],
    [{ logged: 15, missing: 0 }, '15 séries registadas.'],
    [{ logged: 1, missing: 0 }, '1 série registada.'],
    [{ logged: 1, missing: 2 }, '1 série registada. Faltam 2, que não são guardadas.'],
  ])('%o reads "%s"', (counts, text) => {
    expect(formatFinishCounts(counts)).toBe(text)
  })
})

describe('formatFinishNote', () => {
  // Tests run in Europe/Lisbon, which is UTC in November.
  const finishedAt = '2026-11-03T19:42:00.000Z'

  it('says nothing for a workout that finishes now', () => {
    expect(formatFinishNote('now', finishedAt)).toBeNull()
  })

  it('names the time of the last set', () => {
    expect(formatFinishNote('last-set', finishedAt)).toBe('Terminado às 19:42, a hora da última série.')
  })

  it('names the 24-hour limit', () => {
    expect(formatFinishNote('limit', finishedAt)).toBe('Terminado às 19:42, 24 horas depois do início.')
  })

  it('shows the local time, in summer too', () => {
    expect(formatClock('2026-07-01T08:05:00.000Z')).toBe('09:05')
  })
})

describe('formatDuration', () => {
  it.each([
    [0, 'menos de 1 min'],
    [59 * 1000, 'menos de 1 min'],
    [MINUTE, '1 min'],
    [45 * MINUTE, '45 min'],
    [59 * MINUTE + 59_000, '59 min'],
    [60 * MINUTE, '1 h 00 min'],
    [65 * MINUTE, '1 h 05 min'],
    [24 * 60 * MINUTE, '24 h 00 min'],
    [-MINUTE, 'menos de 1 min'],
  ])('%i ms reads "%s"', (ms, text) => {
    expect(formatDuration(ms)).toBe(text)
  })
})

describe('the queue line', () => {
  it('uses the singular and plural', () => {
    expect(formatWaitingCount(1)).toBe('1 treino por enviar')
    expect(formatWaitingCount(2)).toBe('2 treinos por enviar')
    expect(formatRejectedCount(1)).toBe('1 treino não foi aceite')
    expect(formatRejectedCount(3)).toBe('3 treinos não foram aceites')
  })
})

describe('summarizeWorkout', () => {
  it('gives the routine, the duration, the counts and each exercise', () => {
    expect(summarizeWorkout(workout)).toEqual({
      routineName: 'Push',
      duration: '1 h 05 min',
      exerciseCount: 2,
      setCount: 4,
      exercises: [
        { id: 'a', name: 'Supino Barra', sets: 3 },
        { id: 'b', name: 'Elevação lateral', sets: 1 },
      ],
    })
  })

  it('names a workout by its routine and day', () => {
    expect(formatWorkoutLabel(workout)).toBe('Push, 3 de novembro')
  })

  it('counts the sets of a workout', () => {
    expect(countWorkoutSets(workout)).toBe(4)
  })

  it('reads an exercise as "name · sets"', () => {
    expect(formatExerciseSets('Supino Barra', 3)).toBe('Supino Barra · 3 séries')
    expect(formatExerciseSets('Supino Barra', 1)).toBe('Supino Barra · 1 série')
  })
})

describe('sendState', () => {
  const rejected = { ...workout, rejected: { code: '23514', at: '2026-11-03T19:06:00.000Z' } }

  it('is saved once the workout has left the queue', () => {
    expect(sendState('w1', [], null)).toBe('saved')
  })

  it('is sending while this workout is being sent', () => {
    expect(sendState('w1', [workout], 'w1')).toBe('sending')
  })

  it('is waiting while it is in the queue and another one, or none, is being sent', () => {
    expect(sendState('w1', [workout], null)).toBe('waiting')
    expect(sendState('w1', [workout], 'w2')).toBe('waiting')
  })

  it('is rejected when the database refused it', () => {
    expect(sendState('w1', [rejected], null)).toBe('rejected')
  })
})
