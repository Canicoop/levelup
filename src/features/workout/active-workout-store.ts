import { getAccountId, subscribeToAccount } from '@/features/auth/account'
import type { ActiveWorkout } from '@/features/workout/lib/active-workout'
import {
  activeWorkoutKey,
  parseStoredWorkout,
  serializeWorkout,
} from '@/features/workout/lib/active-workout-storage'

let userId: string | null = null
let workout: ActiveWorkout | null = null
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

// Storage can throw (private mode, blocked or full). Reading then finds nothing.
function load(id: string) {
  try {
    return parseStoredWorkout(localStorage.getItem(activeWorkoutKey(id)))
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

// Starts or discards the workout (null), and saves it at once.
export function setActiveWorkout(next: ActiveWorkout | null) {
  if (!userId) return
  workout = next
  save(userId, next)
  notify()
}

// Applies one of the pure functions of active-workout.ts. They return the same
// workout when nothing changed, so nothing is saved then.
export function updateActiveWorkout(update: (current: ActiveWorkout) => ActiveWorkout) {
  if (!workout) return
  const next = update(workout)
  if (next !== workout) setActiveWorkout(next)
}
