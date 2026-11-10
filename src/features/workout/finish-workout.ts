import type { QueryClient } from '@tanstack/react-query'
import {
  getActiveWorkout,
  getActiveWorkoutAccountId,
  setActiveWorkout,
} from '@/features/workout/active-workout-store'
import { workoutKeys } from '@/features/workout/api/query-keys'
import { setLastFinished } from '@/features/workout/last-finished-store'
import { saveLastSetsCopy } from '@/features/workout/api/workouts'
import { finishTime, type FinishReason } from '@/features/workout/lib/finishing'
import { lastSetsFromPayload } from '@/features/workout/lib/last-sets-copy'
import type { PendingWorkout } from '@/features/workout/lib/pending-workouts'
import { toSubmitPayload } from '@/features/workout/lib/workout-payload'
import { queuePendingWorkout } from '@/features/workout/pending-workouts-store'
import { sendPendingWorkouts } from '@/features/workout/send-pending-workouts'

export type FinishResult =
  // No workout in progress.
  | { kind: 'none' }
  // No logged sets: nothing to send ("Não registaste nenhuma série. Descartar treino?").
  | { kind: 'empty' }
  | { kind: 'finished'; workout: PendingWorkout; reason: FinishReason }

// "Terminar" (rule AS for the finish time). The order is what keeps the workout
// safe if the app closes half way:
// 1. it joins the queue on the device;
// 2. only then does it stop being the workout in progress. If the app closed
//    between the two, opening it finds the workout in the queue and drops the
//    one in progress (see the active workout store's load), so it is neither
//    lost nor shown twice; the queue is keyed by id, so it cannot be queued twice.
// If the queue could not be written (storage full or blocked), the workout stays
// stored as in progress and is only taken out of memory: it is never removed
// from the device before it is in the queue there.
// 3. The copy of "Última vez" and the routine of the last workout take the
//    workout at once (rule AT), so the next workout started without network
//    shows the sets just done and suggests the right routine.
// 4. It is sent; without network it waits (see send-pending-workouts.ts).
export function finishActiveWorkout(queryClient: QueryClient, now = new Date().toISOString()): FinishResult {
  const workout = getActiveWorkout()
  const accountId = getActiveWorkoutAccountId()
  if (!workout || !accountId) return { kind: 'none' }

  const { finishedAt, reason } = finishTime(workout, now)
  const payload = toSubmitPayload(workout, finishedAt)
  if (!payload) return { kind: 'empty' }

  const sent = new Set(payload.exercises.map((exercise) => exercise.exercise_id))
  const pending: PendingWorkout = {
    payload,
    routineName: workout.routineName,
    exerciseNames: Object.fromEntries(
      workout.exercises.filter((exercise) => sent.has(exercise.exerciseId)).map((e) => [e.exerciseId, e.name]),
    ),
  }

  const queued = queuePendingWorkout(accountId, pending)
  // For the summary screen, which outlives the workout's time in the queue.
  setLastFinished(accountId, pending)
  setActiveWorkout(null, { keepStored: !queued })

  saveLastSetsCopy(queryClient, [...sent], lastSetsFromPayload(payload))
  queryClient.setQueryData(workoutKeys.lastRoutineId(), payload.routine_id)

  void sendPendingWorkouts(queryClient)
  return { kind: 'finished', workout: pending, reason }
}
