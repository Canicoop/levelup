// The sender of finished workouts, imported on demand, so the Workout data
// layer stays out of the main chunk (see main.tsx, which starts it).
export function loadSender() {
  return import('@/features/workout/send-pending-workouts')
}
