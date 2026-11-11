// The sender of finished workouts, imported on demand (see main.tsx, which
// starts it). Its own chunk is small; the Workout data layer it uses loads at
// start anyway, with Rolldown's runtime helpers (see main.tsx).
export function loadSender() {
  return import('@/features/workout/send-pending-workouts')
}
