import { useSyncExternalStore } from 'react'
import { getActiveWorkout, subscribeToActiveWorkout } from '@/features/workout/active-workout-store'

// The workout in progress of the current account, or null.
export function useActiveWorkout() {
  return useSyncExternalStore(subscribeToActiveWorkout, getActiveWorkout)
}
