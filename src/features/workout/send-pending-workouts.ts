import type { QueryClient } from '@tanstack/react-query'
import { getAccountId, subscribeToAccount } from '@/features/auth/account'
import { workoutKeys } from '@/features/workout/api/query-keys'
import { clearLastFinished } from '@/features/workout/last-finished-store'
import { setSendingId } from '@/features/workout/sending-state'
import { REQUEST_LIMIT_MS, submitWorkout } from '@/features/workout/api/workouts'
import { sendablePendingWorkouts } from '@/features/workout/lib/pending-workouts'
import { withTimeout } from '@/features/workout/lib/with-timeout'
import {
  clearPendingWorkoutRejected,
  getPendingWorkouts,
  markPendingWorkoutRejected,
  removeFromPendingWorkouts,
} from '@/features/workout/pending-workouts-store'
import { prepareWorkoutOffline } from '@/features/workout/prepare-offline'
import { supabase } from '@/lib/supabase'

// Sends the finished workouts waiting on the device, one at a time and oldest
// first. Plain code rather than a TanStack mutation: it also runs with no screen
// open, and, like networkMode 'always', it always tries instead of pausing.

const LOCK_NAME = 'levelup:send-pending-workouts'

// One send at a time in this tab.
let sending: Promise<void> | null = null

export function sendPendingWorkouts(queryClient: QueryClient) {
  sending ??= sendAcrossTabs(queryClient).finally(() => {
    sending = null
  })
  return sending
}

// One send at a time across tabs: a tab that finds the lock taken does nothing,
// since the other one is already sending. Without the Web Locks API, only the
// tab's own guard is left; sending twice is harmless anyway (submit_workout is
// idempotent), only wasted.
async function sendAcrossTabs(queryClient: QueryClient) {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks
  if (!locks) return sendAll(queryClient)
  await locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) => {
    if (lock) await sendAll(queryClient)
  })
}

async function sendAll(queryClient: QueryClient) {
  const accountId = getAccountId()
  if (!accountId) return

  // Nothing to try without network; the `online` event sends.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return

  // Only with a session of this account: without one, every send would fail
  // (as anon) and wait anyway. It is tried again after signing in. Refreshing
  // an expired token can hang on a weak connection, hence the limit.
  let sessionUserId: string | undefined
  try {
    const { data } = await withTimeout(supabase.auth.getSession(), REQUEST_LIMIT_MS)
    sessionUserId = data.session?.user.id
  } catch {
    return
  }
  if (sessionUserId !== accountId) return

  let saved = false
  // The store's list, which follows the storage (another tab may have sent some
  // already) and also holds what could not be stored. A workout another tab
  // sent a moment ago may still be in it: sending it again is harmless.
  for (const pending of sendablePendingWorkouts(getPendingWorkouts())) {
    setSendingId(pending.payload.id)
    const outcome = await submitWorkout(pending.payload).finally(() => setSendingId(null))
    if (outcome.kind === 'saved') {
      removeFromPendingWorkouts(accountId, pending.payload.id)
      saved = true
    } else if (outcome.kind === 'rejected') {
      markPendingWorkoutRejected(accountId, pending.payload.id, outcome.code)
    } else {
      // No network, or anything else that may pass: the rest waits too.
      break
    }
  }

  // The database now has them, so the reads that were laid over with them are
  // asked for again: the routine of the last workout and "Última vez".
  if (saved && getAccountId() === accountId) refreshWorkoutReads(queryClient)
}

function refreshWorkoutReads(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: workoutKeys.lastRoutineId() })
  void prepareWorkoutOffline(queryClient)
}

// "Descartar" on a workout the database refused: it leaves the queue and the
// summary. Finishing had put its sets in the copy of "Última vez" and its
// routine as the last one (rule AT), so both are asked for again; without
// network they wait for the next read.
export function discardPendingWorkout(queryClient: QueryClient, id: string) {
  const accountId = getAccountId()
  if (!accountId) return
  removeFromPendingWorkouts(accountId, id)
  clearLastFinished(accountId, id)
  refreshWorkoutReads(queryClient)
}

// "Tentar outra vez" on a workout the database refused: it goes back to being
// sent by itself, and is sent now.
export function retryRejectedWorkout(queryClient: QueryClient, id: string) {
  const accountId = getAccountId()
  if (!accountId) return Promise.resolve()
  clearPendingWorkoutRejected(accountId, id)
  return sendPendingWorkouts(queryClient)
}

// Sends when the app opens, when the network comes back, when the app comes
// back to the foreground and when an account signs in. A failure waits for the
// next of these: there is no retry loop.
export function startSendingPendingWorkouts(queryClient: QueryClient) {
  const send = () => void sendPendingWorkouts(queryClient)
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') send()
  }

  window.addEventListener('online', send)
  document.addEventListener('visibilitychange', onVisibilityChange)
  // Deferred: the account changes from inside onAuthStateChange, where
  // Supabase warns that awaiting getSession() can deadlock.
  const unsubscribe = subscribeToAccount(() => setTimeout(send, 0))
  send()

  return () => {
    window.removeEventListener('online', send)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    unsubscribe()
  }
}
