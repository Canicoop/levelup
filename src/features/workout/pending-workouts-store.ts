import { getAccountId, subscribeToAccount } from '@/features/auth/account'
import {
  addPendingWorkout,
  clearPendingRejected,
  markPendingRejected,
  parsePendingWorkouts,
  pendingWorkoutsKey,
  removePendingWorkout,
  serializePendingWorkouts,
  type PendingWorkout,
} from '@/features/workout/lib/pending-workouts'

// The finished workouts waiting to be sent, per account (see pending-workouts.ts).
// Like the workout in progress, signing out keeps them under that account's
// key, and they are sent when it signs in again.

const EMPTY: PendingWorkout[] = []

let userId: string | null = null
let workouts: PendingWorkout[] = EMPTY
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

// Null when storage cannot be read (private mode or blocked).
function readStored(accountId: string) {
  try {
    return parsePendingWorkouts(localStorage.getItem(pendingWorkoutsKey(accountId)))
  } catch {
    return null
  }
}

export function readPendingWorkouts(accountId: string) {
  return readStored(accountId) ?? EMPTY
}

// True only when the list is really on the device.
function write(accountId: string, next: PendingWorkout[]) {
  try {
    if (next.length > 0) localStorage.setItem(pendingWorkoutsKey(accountId), serializePendingWorkouts(next))
    else localStorage.removeItem(pendingWorkoutsKey(accountId))
    return true
  } catch {
    return false
  }
}

function syncAccount() {
  const next = getAccountId()
  if (next === userId) return
  userId = next
  workouts = next ? (readStored(next) ?? EMPTY) : EMPTY
  notify()
}

// Another tab finished or sent a workout of this account.
function onStorage(event: StorageEvent) {
  if (!userId || (event.key !== null && event.key !== pendingWorkoutsKey(userId))) return
  workouts = readPendingWorkouts(userId)
  notify()
}

const unsubscribeFromAccount = subscribeToAccount(syncAccount)
window.addEventListener('storage', onStorage)
syncAccount()

import.meta.hot?.dispose(() => {
  unsubscribeFromAccount()
  window.removeEventListener('storage', onStorage)
})

export function subscribeToPendingWorkouts(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getPendingWorkouts() {
  return workouts
}

// Every change starts from what is stored, not from memory, since another tab
// may have changed it; only when storage cannot be read does it start from
// memory. If it cannot be written, the change still applies in memory, as the
// workout in progress does. A workout that only made it to memory can drop out
// on a later change, but then it was never removed from the device as the
// workout in progress (see finishActiveWorkout), so it is not lost. Returns whether the
// change reached the device. The account is passed in, so a send that ends
// after an account change still updates the right list.
function update(accountId: string, change: (current: PendingWorkout[]) => PendingWorkout[]) {
  const current = accountId === userId
  const base = readStored(accountId) ?? (current ? workouts : EMPTY)
  const next = change(base)
  const stored = write(accountId, next)
  if (current) {
    workouts = next
    notify()
  }
  return stored
}

export function queuePendingWorkout(accountId: string, workout: PendingWorkout) {
  return update(accountId, (current) => addPendingWorkout(current, workout))
}

export function removeFromPendingWorkouts(accountId: string, id: string) {
  update(accountId, (current) => removePendingWorkout(current, id))
}

export function markPendingWorkoutRejected(accountId: string, id: string, code: string) {
  update(accountId, (current) => markPendingRejected(current, id, code, new Date().toISOString()))
}

export function clearPendingWorkoutRejected(accountId: string, id: string) {
  update(accountId, (current) => clearPendingRejected(current, id))
}
