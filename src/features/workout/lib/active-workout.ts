import { MAX_ROUTINE_EXERCISES } from '@/features/workout/lib/routine-limits'
import { formatWeight, parseReps, parseWeight, setFieldError, type SetField } from '@/features/workout/lib/set-values'
import { DEFAULT_TARGETS } from '@/features/workout/lib/targets'
import type { Exercise, RoutineWithExercises } from '@/features/workout/lib/types'

// The limits of submit_workout. A workout has the same exercise limit as a routine.
export const MAX_WORKOUT_EXERCISES = MAX_ROUTINE_EXERCISES
export const MAX_SETS_PER_EXERCISE = 20

// One set of the most recent finished workout with this exercise.
export type LastSet = { weightKg: number; reps: number }

// "Última vez" by exercise id, for the exercises that have one.
export type LastSetsByExercise = Record<string, LastSet[]>

// The rows of last_exercise_sets, which come ordered by set, grouped by exercise.
export function groupLastSets(rows: { exercise_id: string; weight_kg: number; reps: number }[]) {
  const lastSets: LastSetsByExercise = {}
  for (const row of rows) {
    lastSets[row.exercise_id] ??= []
    lastSets[row.exercise_id].push({ weightKg: row.weight_kg, reps: row.reps })
  }
  return lastSets
}

// The values stay as typed (see set-values.ts). A set with done = true always
// holds valid values: editSet refuses anything else for it.
export type ActiveSet = { weight: string; reps: string; done: boolean }

// Identified by exerciseId, since an exercise appears once in a workout, and its
// sets by their index, since sets are only ever added at the end. lastSets is
// kept here so "Última vez" still works when a workout is resumed without network.
export type ActiveExercise = {
  exerciseId: string
  name: string
  // The goal, which stays as it was when "+ Série" adds sets.
  targetSets: number
  repMin: number | null
  repMax: number | null
  skipped: boolean
  sets: ActiveSet[]
  lastSets: LastSet[]
  // Swapped in or added without network: this exercise has no "Última vez".
  lastSetsUnavailable: boolean
}

export type ActiveWorkout = {
  // Created on the device, so sending it twice cannot create two workouts.
  id: string
  routineId: string
  routineName: string
  startedAt: string
  // The workout started without network, so no exercise has "Última vez". An
  // empty lastSets then does not mean a first time.
  lastSetsUnavailable: boolean
  // The one exercise shown open, if any.
  openExerciseId: string | null
  exercises: ActiveExercise[]
}

// A set's starting weight: the same set last time, otherwise the previous set
// of this workout. The reps always start empty: last time's are only a suggestion.
function newSet(index: number, lastSets: LastSet[], previous: ActiveSet | undefined): ActiveSet {
  const last = lastSets.at(index)
  return { weight: last ? formatWeight(last.weightKg) : (previous?.weight ?? ''), reps: '', done: false }
}

function newSets(count: number, lastSets: LastSet[]) {
  const sets: ActiveSet[] = []
  for (let index = 0; index < Math.min(count, MAX_SETS_PER_EXERCISE); index++) {
    sets.push(newSet(index, lastSets, sets.at(-1)))
  }
  return sets
}

// An exercise that joins the workout: from the routine, swapped in or added.
function newExercise(
  exercise: Pick<Exercise, 'id' | 'name'>,
  goal: { targetSets: number; setCount: number; repMin: number | null; repMax: number | null },
  lastSets: LastSet[],
  lastSetsUnavailable: boolean,
): ActiveExercise {
  return {
    exerciseId: exercise.id,
    name: exercise.name,
    targetSets: goal.targetSets,
    repMin: goal.repMin,
    repMax: goal.repMax,
    skipped: false,
    sets: newSets(goal.setCount, lastSets),
    lastSets,
    lastSetsUnavailable,
  }
}

export function isExerciseDone(exercise: ActiveExercise) {
  return exercise.sets.every((set) => set.done)
}

function hasLoggedSets(exercise: ActiveExercise) {
  return exercise.sets.some((set) => set.done)
}

// Last time's reps for a set, as a suggestion. Sets beyond last time have none.
export function repsPlaceholder(exercise: ActiveExercise, index: number) {
  return exercise.lastSets.at(index)?.reps.toString() ?? ''
}

// Every set with ✓, skipped exercises included: this is what discarding loses.
export function countLoggedSets(workout: ActiveWorkout) {
  return workout.exercises.reduce(
    (total, exercise) => total + exercise.sets.filter((set) => set.done).length,
    0,
  )
}

// The first exercise after this one, wrapping around, that is neither done nor skipped.
function nextOpenExerciseId(exercises: ActiveExercise[], exerciseId: string) {
  const from = exercises.findIndex((exercise) => exercise.exerciseId === exerciseId)
  for (let step = 1; step < exercises.length; step++) {
    const exercise = exercises[(from + step) % exercises.length]
    if (!exercise.skipped && !isExerciseDone(exercise)) return exercise.exerciseId
  }
  return null
}

function hasExercise(workout: ActiveWorkout, exerciseId: string) {
  return workout.exercises.some((exercise) => exercise.exerciseId === exerciseId)
}

function updateExercise(
  workout: ActiveWorkout,
  exerciseId: string,
  update: (exercise: ActiveExercise) => ActiveExercise,
): ActiveWorkout {
  return {
    ...workout,
    exercises: workout.exercises.map((exercise) => (exercise.exerciseId === exerciseId ? update(exercise) : exercise)),
  }
}

function findSet(workout: ActiveWorkout, exerciseId: string, index: number) {
  return workout.exercises.find((exercise) => exercise.exerciseId === exerciseId)?.sets.at(index)
}

// Each exercise starts with the routine's sets. The id and the time come from
// the caller, so this stays a pure function.
export function startWorkout({
  id,
  startedAt,
  routine,
  lastSets,
  lastSetsUnavailable = false,
}: {
  id: string
  startedAt: string
  routine: Pick<RoutineWithExercises, 'id' | 'name' | 'exercises'>
  lastSets: LastSetsByExercise
  lastSetsUnavailable?: boolean
}): ActiveWorkout {
  // Without network the whole workout has no "Última vez" (lastSetsUnavailable on
  // the workout), not each exercise.
  const exercises = routine.exercises.map((entry) =>
    newExercise(
      entry.exercise,
      { targetSets: entry.target_sets, setCount: entry.target_sets, repMin: entry.rep_min, repMax: entry.rep_max },
      lastSets[entry.exercise_id] ?? [],
      false,
    ),
  )
  return {
    id,
    routineId: routine.id,
    routineName: routine.name,
    startedAt,
    lastSetsUnavailable,
    openExerciseId: exercises.at(0)?.exerciseId ?? null,
    exercises,
  }
}

// A set without ✓ takes anything, since it is only sent once logged. A logged
// set only takes a valid value: the same workout comes back otherwise, and the
// field keeps the text in its draft (see WorkoutSetRow).
export function editSet(
  workout: ActiveWorkout,
  exerciseId: string,
  index: number,
  field: SetField,
  value: string,
): ActiveWorkout {
  const set = findSet(workout, exerciseId, index)
  if (!set) return workout
  if (set.done && setFieldError(field, value) !== null) return workout

  return updateExercise(workout, exerciseId, (exercise) => ({
    ...exercise,
    sets: exercise.sets.map((current, position) => (position === index ? { ...current, [field]: value } : current)),
  }))
}

export type ToggleResult = { ok: true; workout: ActiveWorkout } | { ok: false; error: string }

// ✓ needs a valid weight and reps; the suggested reps do not count. It also
// fills the next set's weight if that is empty. After the last ✓ of an exercise,
// the next one not done or skipped opens; with none left, they all stay closed.
// Tapping ✓ on a logged set removes it, and leaves everything else as it is.
export function toggleSet(workout: ActiveWorkout, exerciseId: string, index: number): ToggleResult {
  const set = findSet(workout, exerciseId, index)
  if (!set) return { ok: true, workout }

  if (set.done) {
    return {
      ok: true,
      workout: updateExercise(workout, exerciseId, (exercise) => ({
        ...exercise,
        sets: exercise.sets.map((current, position) => (position === index ? { ...current, done: false } : current)),
      })),
    }
  }

  const weight = parseWeight(set.weight)
  if (!weight.ok) return { ok: false, error: weight.error }
  const reps = parseReps(set.reps)
  if (!reps.ok) return { ok: false, error: reps.error }

  const logged = updateExercise(workout, exerciseId, (exercise) => ({
    ...exercise,
    sets: exercise.sets.map((current, position) => {
      if (position === index) return { ...current, done: true }
      if (position === index + 1 && current.weight === '') return { ...current, weight: set.weight }
      return current
    }),
  }))

  const exercise = logged.exercises.find((current) => current.exerciseId === exerciseId)
  const finished = exercise !== undefined && isExerciseDone(exercise)
  return {
    ok: true,
    workout: finished
      ? { ...logged, openExerciseId: nextOpenExerciseId(logged.exercises, exerciseId) }
      : logged,
  }
}

// "+ Série". The same workout comes back at the limit of 20 sets.
export function addSet(workout: ActiveWorkout, exerciseId: string): ActiveWorkout {
  return updateExercise(workout, exerciseId, (exercise) =>
    exercise.sets.length >= MAX_SETS_PER_EXERCISE
      ? exercise
      : {
          ...exercise,
          sets: [...exercise.sets, newSet(exercise.sets.length, exercise.lastSets, exercise.sets.at(-1))],
        },
  )
}

// "Saltar" is only for an exercise with no logged sets, so skipping never hides
// sets that were done. A skipped exercise is not sent.
export function canSkipExercise(exercise: ActiveExercise) {
  return !exercise.skipped && !hasLoggedSets(exercise)
}

export function skipExercise(workout: ActiveWorkout, exerciseId: string): ActiveWorkout {
  const exercise = workout.exercises.find((current) => current.exerciseId === exerciseId)
  if (!exercise || !canSkipExercise(exercise)) return workout
  const skipped = updateExercise(workout, exerciseId, (exercise) => ({ ...exercise, skipped: true }))
  return workout.openExerciseId === exerciseId
    ? { ...skipped, openExerciseId: nextOpenExerciseId(skipped.exercises, exerciseId) }
    : skipped
}

export function undoSkip(workout: ActiveWorkout, exerciseId: string): ActiveWorkout {
  if (!hasExercise(workout, exerciseId)) return workout
  return {
    ...updateExercise(workout, exerciseId, (exercise) => ({ ...exercise, skipped: false })),
    openExerciseId: exerciseId,
  }
}

// With logged sets, swapping adds an exercise, so it needs room for one more.
export function canSwapExercise(workout: ActiveWorkout, exerciseId: string) {
  const exercise = workout.exercises.find((current) => current.exerciseId === exerciseId)
  if (!exercise) return false
  return !hasLoggedSets(exercise) || workout.exercises.length < MAX_WORKOUT_EXERCISES
}

// "Trocar", in this workout only, and nothing logged is lost:
// - with no logged sets, the new exercise takes the same place, with the same
//   number of sets and rep range;
// - with logged sets, the exercise keeps only those, and so is complete; the new
//   one comes right after it with the sets that were left (at least one), as
//   its goal, and opens.
// The same workout comes back if the new exercise is already in the workout, or
// there is no room for it (see canSwapExercise).
export function swapExercise(
  workout: ActiveWorkout,
  exerciseId: string,
  replacement: Pick<Exercise, 'id' | 'name'>,
  lastSets: LastSet[],
  lastSetsUnavailable = false,
): ActiveWorkout {
  const index = workout.exercises.findIndex((exercise) => exercise.exerciseId === exerciseId)
  const current = workout.exercises[index]
  if (!current || hasExercise(workout, replacement.id) || !canSwapExercise(workout, exerciseId)) return workout

  const { repMin, repMax } = current
  if (!hasLoggedSets(current)) {
    const swapped = newExercise(
      replacement,
      { targetSets: current.targetSets, setCount: current.sets.length, repMin, repMax },
      lastSets,
      lastSetsUnavailable,
    )
    return {
      ...workout,
      exercises: workout.exercises.map((exercise, position) => (position === index ? swapped : exercise)),
      openExerciseId: workout.openExerciseId === exerciseId ? replacement.id : workout.openExerciseId,
    }
  }

  const logged = current.sets.filter((set) => set.done)
  const remaining = Math.max(1, current.sets.length - logged.length)
  const kept: ActiveExercise = { ...current, skipped: false, sets: logged }
  const added = newExercise(
    replacement,
    { targetSets: remaining, setCount: remaining, repMin, repMax },
    lastSets,
    lastSetsUnavailable,
  )
  return {
    ...workout,
    exercises: [...workout.exercises.slice(0, index), kept, added, ...workout.exercises.slice(index + 1)],
    openExerciseId: replacement.id,
  }
}

export function canAddExercise(workout: ActiveWorkout, exerciseId: string) {
  return workout.exercises.length < MAX_WORKOUT_EXERCISES && !hasExercise(workout, exerciseId)
}

// "+ Adicionar exercício": at the end, with the default sets, and open. The same
// workout comes back if it cannot be added (see canAddExercise).
export function addExercise(
  workout: ActiveWorkout,
  exercise: Pick<Exercise, 'id' | 'name'>,
  lastSets: LastSet[],
  lastSetsUnavailable = false,
): ActiveWorkout {
  if (!canAddExercise(workout, exercise.id)) return workout
  const goal = {
    targetSets: DEFAULT_TARGETS.target_sets,
    setCount: DEFAULT_TARGETS.target_sets,
    repMin: DEFAULT_TARGETS.rep_min,
    repMax: DEFAULT_TARGETS.rep_max,
  }
  return {
    ...workout,
    openExerciseId: exercise.id,
    exercises: [...workout.exercises, newExercise(exercise, goal, lastSets, lastSetsUnavailable)],
  }
}

// Null closes the open exercise. An unknown id changes nothing.
export function openExercise(workout: ActiveWorkout, exerciseId: string | null): ActiveWorkout {
  if (exerciseId !== null && !hasExercise(workout, exerciseId)) return workout
  return { ...workout, openExerciseId: exerciseId }
}
