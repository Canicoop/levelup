// The most exercises a routine can have: the same limit as a workout in
// submit_workout, so any routine can be started as a workout. The database has
// no such check on routine_exercises; the app enforces it.
export const MAX_ROUTINE_EXERCISES = 30

export const ROUTINE_FULL_MESSAGE = `Uma rotina pode ter até ${MAX_ROUTINE_EXERCISES} exercícios.`

export function isRoutineFull(exerciseCount: number) {
  return exerciseCount >= MAX_ROUTINE_EXERCISES
}
