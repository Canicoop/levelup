import { useSyncExternalStore } from 'react'
import { getLastFinished, subscribeToLastFinished } from '@/features/workout/last-finished-store'
import { getPendingWorkouts, subscribeToPendingWorkouts } from '@/features/workout/pending-workouts-store'
import { getSendingId, subscribeToSending } from '@/features/workout/sending-state'

// The finished workouts waiting to be sent, for the current account.
export function usePendingWorkouts() {
  return useSyncExternalStore(subscribeToPendingWorkouts, getPendingWorkouts)
}

// The finished workout being sent right now, if any.
export function useSendingId() {
  return useSyncExternalStore(subscribeToSending, getSendingId)
}

// The last finished workout, for the summary screen.
export function useLastFinished() {
  return useSyncExternalStore(subscribeToLastFinished, getLastFinished)
}
