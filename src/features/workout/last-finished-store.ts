import { getAccountId, subscribeToAccount } from '@/features/auth/account'
import { lastFinishedKey, parseLastFinished, serializeLastFinished } from '@/features/workout/lib/last-finished'
import type { PendingWorkout } from '@/features/workout/lib/pending-workouts'

// The last finished workout of the current account (see last-finished.ts).
// Kept in memory too, so the summary works when storage is blocked.

let userId: string | null = null
let workout: PendingWorkout | null = null
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

function load(id: string) {
  try {
    return parseLastFinished(localStorage.getItem(lastFinishedKey(id)))
  } catch {
    return null
  }
}

function save(id: string, next: PendingWorkout | null) {
  try {
    if (next) localStorage.setItem(lastFinishedKey(id), serializeLastFinished(next))
    else localStorage.removeItem(lastFinishedKey(id))
  } catch {
    // Storage full or blocked: memory still has it.
  }
}

function syncAccount() {
  const next = getAccountId()
  if (next === userId) return
  userId = next
  workout = next ? load(next) : null
  notify()
}

function onStorage(event: StorageEvent) {
  if (!userId || (event.key !== null && event.key !== lastFinishedKey(userId))) return
  workout = load(userId)
  notify()
}

const unsubscribeFromAccount = subscribeToAccount(syncAccount)
window.addEventListener('storage', onStorage)
syncAccount()

import.meta.hot?.dispose(() => {
  unsubscribeFromAccount()
  window.removeEventListener('storage', onStorage)
})

export function subscribeToLastFinished(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getLastFinished() {
  return workout
}

export function setLastFinished(accountId: string, next: PendingWorkout) {
  save(accountId, next)
  if (accountId === userId) {
    workout = next
    notify()
  }
}

// "Concluído", or discarding that workout. Only when it is still the one
// stored, so clearing an old one never removes a newer summary.
export function clearLastFinished(accountId: string, id: string) {
  const stored = accountId === userId ? workout : load(accountId)
  if (stored?.payload.id !== id) return
  save(accountId, null)
  if (accountId === userId) {
    workout = null
    notify()
  }
}
