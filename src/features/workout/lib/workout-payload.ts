import type { ActiveWorkout } from '@/features/workout/lib/active-workout'
import { parseReps, parseWeight } from '@/features/workout/lib/set-values'

// The argument of submit_workout. Positions come from the order of the arrays.
// The weight is text, read as numeric by the database, so it never goes through
// a floating point number.
export type SubmitWorkoutPayload = {
  id: string
  routine_id: string
  started_at: string
  finished_at: string
  exercises: { exercise_id: string; sets: { weight_kg: string; reps: number }[] }[]
}

// Only the logged sets, without skipped exercises or exercises with no logged
// sets. Null when nothing is left: there is nothing to send.
export function toSubmitPayload(workout: ActiveWorkout, finishedAt: string): SubmitWorkoutPayload | null {
  const exercises = workout.exercises.flatMap((exercise) => {
    if (exercise.skipped) return []
    const sets = exercise.sets.flatMap((set) => {
      if (!set.done) return []
      const weight = parseWeight(set.weight)
      const reps = parseReps(set.reps)
      // Logged sets are always valid (see editSet); this only narrows the types.
      return weight.ok && reps.ok ? [{ weight_kg: weight.value, reps: reps.value }] : []
    })
    return sets.length > 0 ? [{ exercise_id: exercise.exerciseId, sets }] : []
  })

  if (exercises.length === 0) return null
  return {
    id: workout.id,
    routine_id: workout.routineId,
    started_at: workout.startedAt,
    finished_at: finishedAt,
    exercises,
  }
}
