// The Workout module's pages, loaded together as one chunk (see load-pages.ts).
export { ActiveWorkoutPage } from '@/features/workout/pages/active-workout-page'
export { ExercisesPage } from '@/features/workout/pages/exercises-page'
export { FinishedWorkoutPage } from '@/features/workout/pages/finished-workout-page'
export { RoutineEditorPage } from '@/features/workout/pages/routine-editor-page'
export { WorkoutDetailPage } from '@/features/workout/pages/workout-detail-page'
export { WorkoutPage } from '@/features/workout/pages/workout-page'
// Not a page: the confirmation to discard a refused workout, loaded lazily by
// the queue line, which Home shows, to keep the drawer out of the main chunk.
export { DiscardPendingSheet } from '@/features/workout/components/discard-pending-sheet'
