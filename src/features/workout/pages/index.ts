// The Workout module's pages, loaded together as one chunk (see load-pages.ts).
export { ActiveWorkoutPage } from '@/features/workout/pages/active-workout-page'
export { ExercisesPage } from '@/features/workout/pages/exercises-page'
export { FinishedWorkoutPage } from '@/features/workout/pages/finished-workout-page'
export { RoutineEditorPage } from '@/features/workout/pages/routine-editor-page'
export { WorkoutDetailPage } from '@/features/workout/pages/workout-detail-page'
export { WorkoutPage } from '@/features/workout/pages/workout-page'
// Not a page: Home's workout card loads it lazily, to keep the drawer out of
// the main chunk (see ActiveWorkoutCard).
export { DiscardWorkoutSheet } from '@/features/workout/components/discard-workout-sheet'
// Also not a page: the confirmation to discard a refused workout, from Home's line.
export { DiscardPendingSheet } from '@/features/workout/components/discard-pending-sheet'
