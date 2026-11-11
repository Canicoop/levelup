import { formatDuration } from '@/features/workout/lib/finish-labels'
import { sendablePendingWorkouts, type PendingWorkout } from '@/features/workout/lib/pending-workouts'
import { formatWeight } from '@/features/workout/lib/set-values'
import { toISODate } from '@/lib/format'

// A finished workout as the history, the heatmap and the detail show it. The
// same shape whether it comes from the database or from the queue (pending:
// still waiting to be sent, shown as "Por enviar").
export type HistorySet = { weightKg: number; reps: number }
export type HistoryExercise = { exerciseId: string; name: string; sets: HistorySet[] }
export type WorkoutRecord = {
  id: string
  routineName: string
  startedAt: string
  finishedAt: string
  exercises: HistoryExercise[]
  pending?: true
}

// A row as the Data API returns it (see api/history.ts). Positions are only for
// ordering; embedded rows come in no guaranteed order.
export type WorkoutRow = {
  id: string
  started_at: string
  finished_at: string
  routine: { name: string } | null
  workout_exercises: {
    exercise_id: string
    position: number
    exercise: { name: string } | null
    workout_sets: { position: number; weight_kg: number; reps: number }[]
  }[]
}

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position

// The composite foreign keys make the routine and the exercise always present;
// the fallbacks only satisfy the generated types.
export function toWorkoutRecord(row: WorkoutRow): WorkoutRecord {
  return {
    id: row.id,
    routineName: row.routine?.name ?? 'Treino',
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    exercises: row.workout_exercises.toSorted(byPosition).map((exercise) => ({
      exerciseId: exercise.exercise_id,
      name: exercise.exercise?.name ?? 'Exercício',
      sets: exercise.workout_sets.toSorted(byPosition).map((set) => ({ weightKg: set.weight_kg, reps: set.reps })),
    })),
  }
}

export function countRecordSets(record: WorkoutRecord) {
  return record.exercises.reduce((total, exercise) => total + exercise.sets.length, 0)
}

// ---------------------------------------------------------------------------
// Days and weeks, always in the device's local time. Dates move by calendar day
// (new Date(y, m, d + n)), never by 24 hours, so a day with a clock change is
// still one day.
// ---------------------------------------------------------------------------

function localMidnight(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

// The Monday of the week (Monday to Sunday) that holds this date, at midnight.
export function startOfWeek(date: Date) {
  const day = localMidnight(date)
  return addDays(day, -((day.getDay() + 6) % 7))
}

export const HEATMAP_WEEKS = 12

// Midnight of the first day the heatmap shows: the Monday 11 weeks before this
// week's, so 12 columns in all.
export function heatmapStart(today: Date) {
  return addDays(startOfWeek(today), -7 * (HEATMAP_WEEKS - 1))
}

// A workout belongs to the day it started, so one that starts at 23:50 and
// ends after midnight counts on the first day.
export function workoutDay(record: Pick<WorkoutRecord, 'startedAt'>) {
  return toISODate(new Date(record.startedAt))
}

export type HeatmapDay = { day: string; isToday: boolean; isFuture: boolean }

// 12 columns (weeks, oldest first), each with 7 days from Monday to Sunday.
export function heatmapWeeks(today: Date): HeatmapDay[][] {
  const start = heatmapStart(today)
  const todayKey = toISODate(today)
  return Array.from({ length: HEATMAP_WEEKS }, (_week, week) =>
    Array.from({ length: 7 }, (_day, weekday) => {
      const day = toISODate(addDays(start, week * 7 + weekday))
      return { day, isToday: day === todayKey, isFuture: day > todayKey }
    }),
  )
}

export type DayTotal = { sets: number; workouts: WorkoutRecord[] }

// Per local day: the sets of every workout that day, and those workouts, the
// most recent first.
export function dayTotals(records: WorkoutRecord[]) {
  const totals = new Map<string, DayTotal>()
  for (const record of records) {
    const day = workoutDay(record)
    const total = totals.get(day) ?? { sets: 0, workouts: [] }
    total.sets += countRecordSets(record)
    total.workouts.push(record)
    totals.set(day, total)
  }
  for (const total of totals.values()) total.workouts.sort(byRecent)
  return totals
}

// The heatmap's colour (rule AU): no workout, 1–9, 10–19, 20 or more sets.
export type HeatmapLevel = 0 | 1 | 2 | 3
export function heatmapLevel(sets: number): HeatmapLevel {
  if (sets <= 0) return 0
  if (sets < 10) return 1
  if (sets < 20) return 2
  return 3
}

// Days of this week (Monday to Sunday) with at least one workout.
export function countTrainingDaysThisWeek(today: Date, totals: Map<string, DayTotal>) {
  const start = startOfWeek(today)
  let days = 0
  for (let offset = 0; offset < 7; offset++) {
    if ((totals.get(toISODate(addDays(start, offset)))?.sets ?? 0) > 0) days++
  }
  return days
}

// "3 esta semana", or "Ainda não treinaste esta semana".
export function formatWeekCount(days: number) {
  return days === 0 ? 'Ainda não treinaste esta semana' : `${days} esta semana`
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

const weekdayFormat = new Intl.DateTimeFormat('pt-PT', { weekday: 'long' })
const dayMonthFormat = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long' })
const dayMonthYearFormat = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })

// Whole calendar days from `date` to `now`, in local time.
function daysAgo(date: Date, now: Date) {
  const utc = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((utc(now) - utc(date)) / 86_400_000)
}

// "hoje", "ontem", "terça-feira" (up to 6 days ago), "3 de novembro", or
// "3 de novembro de 2025" in another year. A date ahead of `now` (a clock that
// went back) shows as a date.
export function formatRelativeDay(iso: string, now: Date) {
  const date = new Date(iso)
  const ago = daysAgo(date, now)
  if (ago === 0) return 'hoje'
  if (ago === 1) return 'ontem'
  if (ago > 1 && ago < 7) return weekdayFormat.format(date)
  return date.getFullYear() === now.getFullYear() ? dayMonthFormat.format(date) : dayMonthYearFormat.format(date)
}

// "60 × 8 · 60 × 7 · 55 × 8".
export function formatWorkoutSets(sets: HistorySet[]) {
  return sets.map((set) => `${formatWeight(set.weightKg)} × ${set.reps}`).join(' · ')
}

export function formatRecordDuration(record: Pick<WorkoutRecord, 'startedAt' | 'finishedAt'>) {
  return formatDuration(Date.parse(record.finishedAt) - Date.parse(record.startedAt))
}

// "Upper - Peito + Tricep · ontem · 1 h 05 min".
export function formatWorkoutLine(record: WorkoutRecord, now: Date) {
  return `${record.routineName} · ${formatRelativeDay(record.startedAt, now)} · ${formatRecordDuration(record)}`
}

// ---------------------------------------------------------------------------
// The queue over the reads (rule AY)
// ---------------------------------------------------------------------------

// The workouts waiting to be sent, as records. Refused ones are left out, as in
// "Última vez": they may be discarded, and the queue line shows them.
export function pendingAsRecords(queue: PendingWorkout[]): WorkoutRecord[] {
  return sendablePendingWorkouts(queue).map(({ payload, routineName, exerciseNames }) => ({
    id: payload.id,
    routineName,
    startedAt: payload.started_at,
    finishedAt: payload.finished_at,
    exercises: payload.exercises.map((exercise) => ({
      exerciseId: exercise.exercise_id,
      name: exerciseNames[exercise.exercise_id] ?? 'Exercício',
      sets: exercise.sets.map((set) => ({ weightKg: Number(set.weight_kg), reps: set.reps })),
    })),
    pending: true,
  }))
}

function byRecent(a: WorkoutRecord, b: WorkoutRecord) {
  return Date.parse(b.finishedAt) - Date.parse(a.finishedAt) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)
}

// The records with the waiting workouts laid over them, the most recent first.
// A workout in both (sent, and the queue not updated yet) is the database's.
export function mergeWithPending(records: WorkoutRecord[], pending: WorkoutRecord[]) {
  const ids = new Set(records.map((record) => record.id))
  return [...records, ...pending.filter((record) => !ids.has(record.id))].sort(byRecent)
}

// Only the workouts that started on or after the heatmap's first day.
export function inHeatmap(records: WorkoutRecord[], today: Date) {
  const first = toISODate(heatmapStart(today))
  return records.filter((record) => workoutDay(record) >= first)
}
