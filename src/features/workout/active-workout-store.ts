import { getAccountId, subscribeToAccount } from '@/features/auth/account'
import type { ActiveWorkout } from '@/features/workout/lib/active-workout'
import {
  activeWorkoutKey,
  parseStoredWorkout,
  serializeWorkout,
} from '@/features/workout/lib/active-workout-storage'
import { readPendingWorkouts } from '@/features/workout/pending-workouts-store'

let userId: string | null = null
let workout: ActiveWorkout | null = null
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

// Storage can throw (private mode, blocked or full). Reading then finds nothing.
// Finishing queues the workout first and removes it from here second (see
// finishActiveWorkout); if the app closed between the two, the workout is
// already in the queue, so it is removed here instead of showing as in progress.
function load(id: string) {
  try {
    const stored = parseStoredWorkout(localStorage.getItem(activeWorkoutKey(id)))
    if (stored && readPendingWorkouts(id).some((pending) => pending.payload.id === stored.id)) {
      localStorage.removeItem(activeWorkoutKey(id))
      return null
    }
    return stored
  } catch {
    return null
  }
}

// If saving fails, the workout carries on in memory.
function save(id: string, next: ActiveWorkout | null) {
  try {
    if (next) localStorage.setItem(activeWorkoutKey(id), serializeWorkout(next))
    else localStorage.removeItem(activeWorkoutKey(id))
  } catch {
    // Nothing else to do: the screen still has the workout.
  }
}

// Reads the storage when the account changes (see getAccountId, which also
// survives being offline with an expired token). Signing out does not delete
// the workout: it stays under that account's key.
function syncAccount() {
  const next = getAccountId()
  if (next === userId) return
  userId = next
  workout = next ? load(next) : null
  notify()
}

// Another tab changed this account's workout. A null key means storage was cleared.
function onStorage(event: StorageEvent) {
  if (!userId || (event.key !== null && event.key !== activeWorkoutKey(userId))) return
  workout = load(userId)
  notify()
}

const unsubscribeFromAccount = subscribeToAccount(syncAccount)
window.addEventListener('storage', onStorage)
syncAccount()

// Avoid duplicate subscriptions when this module is hot-reloaded in development.
import.meta.hot?.dispose(() => {
  unsubscribeFromAccount()
  window.removeEventListener('storage', onStorage)
})

export function subscribeToActiveWorkout(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getActiveWorkout() {
  return workout
}

// Starts or discards the workout (null), and saves it at once. keepStored
// leaves the device as it is: finishing uses it when the queue could not be
// written, so the workout is never removed from the device before it is in the
// queue there (sending it again later cannot duplicate it).
export function setActiveWorkout(next: ActiveWorkout | null, { keepStored = false } = {}) {
  if (!userId) return
  workout = next
  if (!keepStored) save(userId, next)
  notify()
}

export function getActiveWorkoutAccountId() {
  return userId
}

// Applies one of the pure functions of active-workout.ts. They return the same
// workout when nothing changed, so nothing is saved then.
export function updateActiveWorkout(update: (current: ActiveWorkout) => ActiveWorkout) {
  if (!workout) return
  const next = update(workout)
  if (next !== workout) setActiveWorkout(next)
}
