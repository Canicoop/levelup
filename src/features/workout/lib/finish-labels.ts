import type { FinishReason } from '@/features/workout/lib/finishing'
import { formatLoggedSets } from '@/features/workout/lib/labels'
import type { PendingWorkout } from '@/features/workout/lib/pending-workouts'

// "1 série", "3 séries".
export function formatSetCount(count: number) {
  return count === 1 ? '1 série' : `${count} séries`
}

// "15 séries registadas. Faltam 3, que não são guardadas.", or only the first
// sentence when nothing is missing.
export function formatFinishCounts({ logged, missing }: { logged: number; missing: number }) {
  const done = `${formatLoggedSets(logged)}.`
  if (missing === 0) return done
  return missing === 1 ? `${done} Falta 1, que não é guardada.` : `${done} Faltam ${missing}, que não são guardadas.`
}

const clockFormat = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' })

// "19:42", in the device's time zone.
export function formatClock(iso: string) {
  return clockFormat.format(new Date(iso))
}

const dayFormat = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long' })

// "Push, 3 de novembro": which refused workout is which, when there are several.
export function formatWorkoutLabel(workout: PendingWorkout) {
  return `${workout.routineName}, ${dayFormat.format(new Date(workout.payload.finished_at))}`
}

// The line in the confirmation when the workout does not finish now (rule AS).
export function formatFinishNote(reason: FinishReason, finishedAt: string) {
  if (reason === 'last-set') return `Terminado às ${formatClock(finishedAt)}, a hora da última série.`
  if (reason === 'limit') return `Terminado às ${formatClock(finishedAt)}, 24 horas depois do início.`
  return null
}

// "45 min", "1 h 05 min", "1 h 00 min", or "menos de 1 min". Whole minutes,
// rounded down.
export function formatDuration(ms: number) {
  const minutes = Math.floor(Math.max(0, ms) / 60_000)
  if (minutes < 1) return 'menos de 1 min'
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`
}

// "1 treino por enviar", "2 treinos por enviar".
export function formatWaitingCount(count: number) {
  return count === 1 ? '1 treino por enviar' : `${count} treinos por enviar`
}

// "1 treino não foi aceite", "2 treinos não foram aceites".
export function formatRejectedCount(count: number) {
  return count === 1 ? '1 treino não foi aceite' : `${count} treinos não foram aceites`
}

// What the summary screen shows of a finished workout.
export function summarizeWorkout(workout: PendingWorkout) {
  const { payload, exerciseNames } = workout
  const exercises = payload.exercises.map((exercise) => ({
    id: exercise.exercise_id,
    // A name is always kept; the fallback only covers a damaged entry.
    name: exerciseNames[exercise.exercise_id] ?? 'Exercício',
    sets: exercise.sets.length,
  }))
  return {
    routineName: workout.routineName,
    duration: formatDuration(Date.parse(payload.finished_at) - Date.parse(payload.started_at)),
    exerciseCount: exercises.length,
    setCount: exercises.reduce((total, exercise) => total + exercise.sets, 0),
    exercises,
  }
}

// "Supino Barra · 3 séries".
export function formatExerciseSets(name: string, sets: number) {
  return `${name} · ${formatSetCount(sets)}`
}

export function countWorkoutSets(workout: PendingWorkout) {
  return workout.payload.exercises.reduce((total, exercise) => total + exercise.sets.length, 0)
}

export type SendState = 'sending' | 'saved' | 'waiting' | 'rejected'

// The sending state of a finished workout, from the queue: no longer in it
// means it reached the database (discarding also removes the summary, see
// discardPendingWorkout). In it, it is being sent, refused, or waiting.
export function sendState(id: string, queue: PendingWorkout[], sendingId: string | null): SendState {
  const queued = queue.find((workout) => workout.payload.id === id)
  if (!queued) return 'saved'
  if (queued.rejected) return 'rejected'
  return sendingId === id ? 'sending' : 'waiting'
}

export const SEND_STATE_LABELS: Record<SendState, string> = {
  sending: 'A enviar…',
  saved: 'Guardado',
  waiting: 'À espera de rede, é enviado sozinho',
  rejected: 'Não foi aceite',
}
