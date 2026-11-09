import { describe, expect, it } from 'vitest'
import {
  MAX_SETS_PER_EXERCISE,
  MAX_WORKOUT_EXERCISES,
  addExercise,
  addSet,
  canAddExercise,
  canSkipExercise,
  canSwapExercise,
  countLoggedSets,
  editSet,
  groupLastSets,
  isExerciseDone,
  openExercise,
  repsPlaceholder,
  skipExercise,
  startWorkout,
  swapExercise,
  toggleSet,
  undoSkip,
  type ActiveExercise,
  type ActiveWorkout,
  type LastSetsByExercise,
} from '@/features/workout/lib/active-workout'
import type { RoutineExercise } from '@/features/workout/lib/types'

function entry(exerciseId: string, targetSets: number, repMin: number | null = null, repMax = repMin): RoutineExercise {
  return {
    id: `entry-${exerciseId}`,
    exercise_id: exerciseId,
    position: 0,
    target_sets: targetSets,
    rep_min: repMin,
    rep_max: repMax,
    created_at: '2026-11-01T10:00:00Z',
    exercise: { id: exerciseId, name: `Nome ${exerciseId}`, archived_at: null },
  }
}

function start(entries: RoutineExercise[], lastSets: LastSetsByExercise = {}) {
  return startWorkout({
    id: 'workout-1',
    startedAt: '2026-11-03T18:00:00Z',
    routine: { id: 'routine-1', name: 'Push', exercises: entries },
    lastSets,
  })
}

function exercise(workout: ActiveWorkout, exerciseId: string): ActiveExercise {
  const found = workout.exercises.find((current) => current.exerciseId === exerciseId)
  if (!found) throw new Error(`No exercise ${exerciseId}`)
  return found
}

// Fills a set and logs it, failing the test if ✓ is refused.
function logSet(workout: ActiveWorkout, exerciseId: string, index: number, weight = '40', reps = '8') {
  const filled = editSet(editSet(workout, exerciseId, index, 'weight', weight), exerciseId, index, 'reps', reps)
  const result = toggleSet(filled, exerciseId, index)
  if (!result.ok) throw new Error(result.error)
  return result.workout
}

function logAll(workout: ActiveWorkout, exerciseId: string) {
  return exercise(workout, exerciseId).sets.reduce((current, _set, index) => logSet(current, exerciseId, index), workout)
}

describe('groupLastSets', () => {
  it('groups the rows by exercise, keeping their order', () => {
    const rows = [
      { exercise_id: 'a', weight_kg: 22.5, reps: 10 },
      { exercise_id: 'a', weight_kg: 25, reps: 8 },
      { exercise_id: 'b', weight_kg: 100, reps: 5 },
    ]
    expect(groupLastSets(rows)).toEqual({
      a: [
        { weightKg: 22.5, reps: 10 },
        { weightKg: 25, reps: 8 },
      ],
      b: [{ weightKg: 100, reps: 5 }],
    })
  })

  it('is empty without rows', () => {
    expect(groupLastSets([])).toEqual({})
  })
})

describe('repsPlaceholder', () => {
  it('suggests the reps of the same set last time, and nothing beyond it', () => {
    const workout = start([entry('a', 3)], {
      a: [
        { weightKg: 40, reps: 12 },
        { weightKg: 40, reps: 10 },
      ],
    })
    const current = exercise(workout, 'a')
    expect([0, 1, 2].map((index) => repsPlaceholder(current, index))).toEqual(['12', '10', ''])
  })

  it('suggests nothing with no history', () => {
    expect(repsPlaceholder(exercise(start([entry('a', 1)]), 'a'), 0)).toBe('')
  })
})

describe('countLoggedSets', () => {
  it('counts the sets with ✓', () => {
    const workout = start([entry('a', 2), entry('b', 2)])
    expect(countLoggedSets(workout)).toBe(0)
    expect(countLoggedSets(logSet(logSet(workout, 'a', 0), 'b', 1))).toBe(2)
  })

  it('counts the sets of skipped exercises too, since discarding loses them', () => {
    const workout = skipExercise(logSet(start([entry('a', 2), entry('b', 1)]), 'a', 0), 'a')
    expect(countLoggedSets(workout)).toBe(1)
  })
})

describe('startWorkout', () => {
  it('records that last time could not be read', () => {
    expect(start([entry('a', 1)]).lastSetsUnavailable).toBe(false)
    const offline = startWorkout({
      id: 'workout-1',
      startedAt: '2026-11-03T18:00:00Z',
      routine: { id: 'routine-1', name: 'Push', exercises: [entry('a', 1)] },
      lastSets: {},
      lastSetsUnavailable: true,
    })
    expect(offline.lastSetsUnavailable).toBe(true)
  })

  it('keeps the goal when sets are added', () => {
    const workout = addSet(start([entry('a', 3)]), 'a')
    expect(exercise(workout, 'a').targetSets).toBe(3)
    expect(exercise(workout, 'a').sets).toHaveLength(4)
  })

  it('keeps the id, the time and the routine, and opens the first exercise', () => {
    const workout = start([entry('a', 3), entry('b', 2)])
    expect(workout).toMatchObject({
      id: 'workout-1',
      routineId: 'routine-1',
      routineName: 'Push',
      startedAt: '2026-11-03T18:00:00Z',
      openExerciseId: 'a',
    })
  })

  it('starts each exercise with the sets of the routine', () => {
    const workout = start([entry('a', 3), entry('b', 1)])
    expect(exercise(workout, 'a').sets).toHaveLength(3)
    expect(exercise(workout, 'b').sets).toHaveLength(1)
  })

  it('keeps the name and the rep range of each exercise', () => {
    expect(exercise(start([entry('a', 3, 8, 12)]), 'a')).toMatchObject({ name: 'Nome a', repMin: 8, repMax: 12 })
  })

  it('takes the weight from the same set last time, and leaves the reps empty', () => {
    const workout = start([entry('a', 2)], {
      a: [
        { weightKg: 22.5, reps: 10 },
        { weightKg: 25, reps: 8 },
      ],
    })
    expect(exercise(workout, 'a').sets).toEqual([
      { weight: '22,5', reps: '', done: false },
      { weight: '25', reps: '', done: false },
    ])
  })

  it('takes the weight from the previous set when last time had fewer sets', () => {
    const workout = start([entry('a', 3)], { a: [{ weightKg: 40, reps: 8 }] })
    expect(exercise(workout, 'a').sets.map((set) => set.weight)).toEqual(['40', '40', '40'])
  })

  it('leaves the weight empty with no last time', () => {
    const workout = start([entry('a', 2)])
    expect(exercise(workout, 'a').sets.map((set) => set.weight)).toEqual(['', ''])
    expect(exercise(workout, 'a').lastSets).toEqual([])
  })

  it('keeps last time inside the workout, for resuming without network', () => {
    const lastSets = [{ weightKg: 40, reps: 8 }]
    expect(exercise(start([entry('a', 1)], { a: lastSets }), 'a').lastSets).toEqual(lastSets)
  })

  it('has nothing open for a routine without exercises', () => {
    expect(start([]).openExerciseId).toBeNull()
  })
})

describe('editSet', () => {
  it('changes one field of one set', () => {
    const workout = editSet(start([entry('a', 2)]), 'a', 1, 'weight', '22,5')
    expect(exercise(workout, 'a').sets).toEqual([
      { weight: '', reps: '', done: false },
      { weight: '22,5', reps: '', done: false },
    ])
  })

  it('accepts anything on a set without ✓, on the way to a value', () => {
    const workout = editSet(start([entry('a', 1)]), 'a', 0, 'weight', '22,')
    expect(exercise(workout, 'a').sets[0].weight).toBe('22,')
  })

  it('accepts a valid value on a set with ✓, which stays logged', () => {
    const logged = logSet(start([entry('a', 2)]), 'a', 0)
    const edited = editSet(editSet(logged, 'a', 0, 'weight', '45'), 'a', 0, 'reps', '6')
    expect(exercise(edited, 'a').sets[0]).toEqual({ weight: '45', reps: '6', done: true })
  })

  it.each([
    ['weight', ''],
    ['weight', '22,'],
    ['weight', '0'],
    ['reps', ''],
    ['reps', '101'],
    ['reps', '8,5'],
  ] as const)('refuses an invalid value on a set with ✓ (%s %j)', (field, value) => {
    const logged = logSet(start([entry('a', 2)]), 'a', 0)
    expect(editSet(logged, 'a', 0, field, value)).toBe(logged)
  })

  it('changes nothing for an unknown exercise or set', () => {
    const workout = start([entry('a', 1)])
    expect(editSet(workout, 'x', 0, 'weight', '40')).toBe(workout)
    expect(editSet(workout, 'a', 5, 'weight', '40')).toBe(workout)
  })
})

describe('toggleSet', () => {
  it('logs a set with a valid weight and reps', () => {
    expect(exercise(logSet(start([entry('a', 2)]), 'a', 0), 'a').sets[0].done).toBe(true)
  })

  it('refuses ✓ without a weight', () => {
    const workout = editSet(start([entry('a', 1)]), 'a', 0, 'reps', '8')
    expect(toggleSet(workout, 'a', 0)).toEqual({ ok: false, error: 'Escreve o peso.' })
  })

  it('refuses ✓ with empty reps, even with a suggestion from last time', () => {
    const workout = start([entry('a', 1)], { a: [{ weightKg: 40, reps: 8 }] })
    expect(toggleSet(workout, 'a', 0)).toEqual({ ok: false, error: 'Escreve as repetições.' })
  })

  it('refuses ✓ with invalid values', () => {
    const halfTyped = editSet(editSet(start([entry('a', 1)]), 'a', 0, 'weight', '22,'), 'a', 0, 'reps', '8')
    expect(toggleSet(halfTyped, 'a', 0)).toEqual({ ok: false, error: 'Usa um número com até 2 casas decimais.' })
  })

  it('removes ✓ on a second tap and keeps the values', () => {
    const logged = logSet(start([entry('a', 2)]), 'a', 0)
    const result = toggleSet(logged, 'a', 0)
    expect(result.ok && exercise(result.workout, 'a').sets[0]).toEqual({ weight: '40', reps: '8', done: false })
  })

  it('fills the next set when it is empty', () => {
    const workout = logSet(start([entry('a', 3)]), 'a', 0, '22,5')
    expect(exercise(workout, 'a').sets.map((set) => set.weight)).toEqual(['22,5', '22,5', ''])
  })

  it('does not replace a weight already in the next set', () => {
    const typed = editSet(start([entry('a', 2)]), 'a', 1, 'weight', '50')
    expect(exercise(logSet(typed, 'a', 0, '40'), 'a').sets[1].weight).toBe('50')
  })

  it('keeps the exercise open until its last set', () => {
    expect(logSet(start([entry('a', 2), entry('b', 1)]), 'a', 0).openExerciseId).toBe('a')
  })

  it('opens the next exercise after the last ✓', () => {
    expect(logAll(start([entry('a', 2), entry('b', 1)]), 'a').openExerciseId).toBe('b')
  })

  it('jumps over exercises done or skipped', () => {
    let workout = start([entry('a', 1), entry('b', 1), entry('c', 1), entry('d', 1)])
    workout = logAll(workout, 'b')
    workout = skipExercise(workout, 'c')
    expect(logAll(workout, 'a').openExerciseId).toBe('d')
  })

  it('wraps around to an earlier exercise that is not done', () => {
    const workout = openExercise(start([entry('a', 1), entry('b', 1)]), 'b')
    expect(logAll(workout, 'b').openExerciseId).toBe('a')
  })

  it('closes everything after the last set of the last exercise left', () => {
    const workout = logAll(start([entry('a', 1), entry('b', 2)]), 'a')
    expect(workout.openExerciseId).toBe('b')
    const finished = logAll(workout, 'b')
    expect(finished.openExerciseId).toBeNull()
    expect(finished.exercises.every(isExerciseDone)).toBe(true)
  })

  it('closes a workout with a single exercise after its last set', () => {
    expect(logAll(start([entry('a', 2)]), 'a').openExerciseId).toBeNull()
  })

  it('leaves nothing open when every exercise is done or skipped', () => {
    const workout = skipExercise(start([entry('a', 1), entry('b', 1)]), 'b')
    expect(logAll(workout, 'a').openExerciseId).toBeNull()
  })

  it('does not move on when removing ✓', () => {
    const done = openExercise(logAll(start([entry('a', 1), entry('b', 1)]), 'a'), 'a')
    const result = toggleSet(done, 'a', 0)
    expect(result.ok && result.workout.openExerciseId).toBe('a')
  })
})

describe('isExerciseDone', () => {
  it('is true only when every set is logged', () => {
    const workout = logSet(start([entry('a', 2)]), 'a', 0)
    expect(isExerciseDone(exercise(workout, 'a'))).toBe(false)
    expect(isExerciseDone(exercise(logSet(workout, 'a', 1), 'a'))).toBe(true)
  })
})

describe('addSet', () => {
  it('uses the same set last time when there is one', () => {
    const workout = start([entry('a', 1)], {
      a: [
        { weightKg: 40, reps: 8 },
        { weightKg: 45, reps: 6 },
      ],
    })
    expect(exercise(addSet(workout, 'a'), 'a').sets[1]).toEqual({ weight: '45', reps: '', done: false })
  })

  it('otherwise uses the previous set of this workout', () => {
    const typed = editSet(start([entry('a', 1)]), 'a', 0, 'weight', '22,5')
    expect(exercise(addSet(typed, 'a'), 'a').sets[1].weight).toBe('22,5')
  })

  it('stops at 20 sets', () => {
    const workout = start([entry('a', MAX_SETS_PER_EXERCISE)])
    expect(exercise(addSet(workout, 'a'), 'a').sets).toHaveLength(MAX_SETS_PER_EXERCISE)
  })
})

describe('skipExercise and undoSkip', () => {
  it('skips the open exercise and opens the next', () => {
    const workout = skipExercise(start([entry('a', 1), entry('b', 1)]), 'a')
    expect(exercise(workout, 'a').skipped).toBe(true)
    expect(workout.openExerciseId).toBe('b')
  })

  it('leaves the open exercise when skipping another', () => {
    expect(skipExercise(start([entry('a', 1), entry('b', 1)]), 'b').openExerciseId).toBe('a')
  })

  it('refuses an exercise with logged sets, which never hides work done', () => {
    const logged = logSet(start([entry('a', 2), entry('b', 1)]), 'a', 0)
    expect(canSkipExercise(exercise(logged, 'a'))).toBe(false)
    expect(skipExercise(logged, 'a')).toBe(logged)
  })

  it('refuses an exercise already skipped', () => {
    const skipped = skipExercise(start([entry('a', 1), entry('b', 1)]), 'a')
    expect(canSkipExercise(exercise(skipped, 'a'))).toBe(false)
    expect(skipExercise(skipped, 'a')).toBe(skipped)
  })

  it('undoing brings the exercise back, open', () => {
    const skipped = skipExercise(start([entry('a', 2), entry('b', 1)]), 'a')
    const undone = undoSkip(skipped, 'a')
    expect(exercise(undone, 'a').skipped).toBe(false)
    expect(undone.openExerciseId).toBe('a')
  })

  it('changes nothing for an unknown exercise', () => {
    const workout = start([entry('a', 1)])
    expect(skipExercise(workout, 'x')).toBe(workout)
    expect(undoSkip(workout, 'x')).toBe(workout)
  })
})

describe('swapExercise', () => {
  const replacement = { id: 'z', name: 'Nome z' }

  it('without logged sets, takes the same place, number of sets, goal and rep range', () => {
    const typed = addSet(start([entry('a', 3, 8, 12), entry('b', 1)]), 'a')
    const workout = swapExercise(typed, 'a', replacement, [])
    expect(workout.exercises.map((current) => current.exerciseId)).toEqual(['z', 'b'])
    expect(exercise(workout, 'z')).toMatchObject({ name: 'Nome z', targetSets: 3, repMin: 8, repMax: 12 })
    expect(exercise(workout, 'z').sets).toHaveLength(4)
  })

  it('uses the new exercise\'s last time', () => {
    const lastSets = [{ weightKg: 15, reps: 12 }]
    const swapped = exercise(swapExercise(start([entry('a', 2)]), 'a', replacement, lastSets), 'z')
    expect(swapped.sets.map((set) => set.weight)).toEqual(['15', '15'])
    expect(swapped.lastSets).toEqual(lastSets)
  })

  it('with logged sets, keeps them and adds the new exercise after it with the rest', () => {
    const logged = logSet(logSet(start([entry('a', 4, 8, 12), entry('b', 1)]), 'a', 0), 'a', 2)
    const workout = swapExercise(logged, 'a', replacement, [{ weightKg: 15, reps: 12 }])
    expect(workout.exercises.map((current) => current.exerciseId)).toEqual(['a', 'z', 'b'])
    expect(exercise(workout, 'a').sets).toEqual([
      { weight: '40', reps: '8', done: true },
      { weight: '40', reps: '8', done: true },
    ])
    expect(isExerciseDone(exercise(workout, 'a'))).toBe(true)
    expect(exercise(workout, 'z')).toMatchObject({ targetSets: 2, repMin: 8, repMax: 12 })
    expect(exercise(workout, 'z').sets).toHaveLength(2)
    expect(workout.openExerciseId).toBe('z')
  })

  it('with every set logged, the new exercise still gets one set', () => {
    const done = logAll(start([entry('a', 2), entry('b', 1)]), 'a')
    const workout = swapExercise(done, 'a', replacement, [])
    expect(exercise(workout, 'a').sets).toHaveLength(2)
    expect(exercise(workout, 'z')).toMatchObject({ targetSets: 1 })
    expect(exercise(workout, 'z').sets).toHaveLength(1)
  })

  it('marks "Última vez" as unavailable on the new exercise only', () => {
    const workout = swapExercise(start([entry('a', 1), entry('b', 1)]), 'a', replacement, [], true)
    expect(exercise(workout, 'z').lastSetsUnavailable).toBe(true)
    expect(exercise(workout, 'b').lastSetsUnavailable).toBe(false)
  })

  it('with logged sets, needs room for one more exercise', () => {
    const entries = Array.from({ length: MAX_WORKOUT_EXERCISES }, (_, index) => entry(`e${index}`, 2))
    const full = start(entries)
    expect(canSwapExercise(full, 'e0')).toBe(true)
    const logged = logSet(full, 'e0', 0)
    expect(canSwapExercise(logged, 'e0')).toBe(false)
    expect(swapExercise(logged, 'e0', replacement, [])).toBe(logged)
  })

  it('moves the open exercise with it, and clears a skip', () => {
    const open = swapExercise(start([entry('a', 1)]), 'a', replacement, [])
    expect(open.openExerciseId).toBe('z')
    const skipped = skipExercise(start([entry('a', 1), entry('b', 1)]), 'a')
    expect(exercise(swapExercise(skipped, 'a', replacement, []), 'z').skipped).toBe(false)
  })

  it('leaves another open exercise as it is', () => {
    expect(swapExercise(start([entry('a', 1), entry('b', 1)]), 'b', replacement, []).openExerciseId).toBe('a')
  })

  it('refuses an exercise already in the workout, or an unknown one', () => {
    const workout = start([entry('a', 1), entry('b', 1)])
    expect(swapExercise(workout, 'a', { id: 'b', name: 'Nome b' }, [])).toBe(workout)
    expect(swapExercise(workout, 'x', replacement, [])).toBe(workout)
  })
})

describe('addExercise', () => {
  const extra = { id: 'z', name: 'Nome z' }

  it('adds it at the end, open, with 3 sets and no rep range', () => {
    const workout = addExercise(start([entry('a', 1)]), extra, [{ weightKg: 15, reps: 12 }])
    expect(workout.exercises.map((current) => current.exerciseId)).toEqual(['a', 'z'])
    expect(workout.openExerciseId).toBe('z')
    expect(exercise(workout, 'z')).toMatchObject({ repMin: null, repMax: null, skipped: false })
    expect(exercise(workout, 'z').sets.map((set) => set.weight)).toEqual(['15', '15', '15'])
  })

  it('marks "Última vez" as unavailable when added without network', () => {
    expect(exercise(addExercise(start([entry('a', 1)]), extra, [], true), 'z').lastSetsUnavailable).toBe(true)
    expect(exercise(addExercise(start([entry('a', 1)]), extra, []), 'z').lastSetsUnavailable).toBe(false)
  })

  it('refuses an exercise already in the workout', () => {
    const workout = start([entry('a', 1)])
    expect(canAddExercise(workout, 'a')).toBe(false)
    expect(addExercise(workout, { id: 'a', name: 'Nome a' }, [])).toBe(workout)
  })

  it('stops at 30 exercises', () => {
    const entries = Array.from({ length: MAX_WORKOUT_EXERCISES }, (_, index) => entry(`e${index}`, 1))
    const workout = start(entries)
    expect(canAddExercise(workout, 'z')).toBe(false)
    expect(addExercise(workout, extra, [])).toBe(workout)
  })
})

describe('openExercise', () => {
  it('opens an exercise, or none', () => {
    const workout = start([entry('a', 1), entry('b', 1)])
    expect(openExercise(workout, 'b').openExerciseId).toBe('b')
    expect(openExercise(workout, null).openExerciseId).toBeNull()
  })

  it('changes nothing for an unknown exercise', () => {
    const workout = start([entry('a', 1)])
    expect(openExercise(workout, 'x')).toBe(workout)
  })
})

describe('a set with ✓', () => {
  it('is always valid, whatever is typed into it', () => {
    let workout = logSet(start([entry('a', 1)]), 'a', 0, '22,5', '8')
    for (const value of ['', '2', '22', '22,', '22,7', 'abc']) {
      workout = editSet(workout, 'a', 0, 'weight', value)
    }
    expect(exercise(workout, 'a').sets[0]).toEqual({ weight: '22,7', reps: '8', done: true })
  })
})
