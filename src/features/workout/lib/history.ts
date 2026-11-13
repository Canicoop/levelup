import { formatClock, formatDuration, formatSetCount } from '@/features/workout/lib/finish-labels'
import { formatExerciseCount } from '@/features/workout/lib/labels'
import { sendablePendingWorkouts, type PendingWorkout } from '@/features/workout/lib/pending-workouts'
import { formatWeight } from '@/features/workout/lib/set-values'
import { toISODate } from '@/lib/format'

// A finished workout as the history, the calendar and the detail show it. The
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

// A workout belongs to the day it started, so one that starts at 23:50 and
// ends after midnight counts on the first day.
export function workoutDay(record: Pick<WorkoutRecord, 'startedAt'>) {
  return toISODate(new Date(record.startedAt))
}

// ---------------------------------------------------------------------------
// Months, for Home's calendar (rule AU). A month is "2026-11", in local time.
// ---------------------------------------------------------------------------

export type Month = string

export function monthOf(date: Date): Month {
  return toISODate(date).slice(0, 7)
}

// Midnight of the month's first day.
export function monthStart(month: Month) {
  const [year, index] = month.split('-').map(Number)
  return new Date(year, index - 1, 1)
}

export function addMonths(month: Month, months: number): Month {
  const start = monthStart(month)
  return monthOf(new Date(start.getFullYear(), start.getMonth() + months, 1))
}

// The month Home's calendar shows once the current month changes from `was` to
// `now` (a new month while the app stayed open, seen when it comes back to the
// foreground or when useNow ticks): a calendar on the month that was current
// follows to the new one; one the user moved to another month stays there.
export function followCurrentMonth(shown: Month, was: Month, now: Month): Month {
  return shown === was ? now : shown
}

// What a month's read asks for, by finished_at: from midnight of its first day
// to a day after midnight of the next month's first day. A workout belongs to
// the day it started (inMonth), so one that starts on the 31st at 23:50 and
// ends after midnight is still found; the database refuses workouts of 24
// hours or more, so a day is enough.
export function monthReadRange(month: Month) {
  return { from: monthStart(month), until: addDays(monthStart(addMonths(month, 1)), 1) }
}

// Only the workouts that started in the month.
export function inMonth(records: WorkoutRecord[], month: Month) {
  return records.filter((record) => workoutDay(record).startsWith(`${month}-`))
}

export type CalendarDay = {
  day: string
  // 1 to 31; days of the months around it are left empty.
  date: number
  inMonth: boolean
  isToday: boolean
  isFuture: boolean
}

// Always 6 weeks of 7 days, Monday to Sunday, from the Monday on or before the
// month's first day, so the calendar keeps its height whether the month takes
// 4, 5 or 6 rows.
export const CALENDAR_WEEKS = 6

export function calendarWeeks(month: Month, today: Date): CalendarDay[][] {
  const start = startOfWeek(monthStart(month))
  const todayKey = toISODate(today)
  return Array.from({ length: CALENDAR_WEEKS }, (_week, week) =>
    Array.from({ length: 7 }, (_day, weekday) => {
      const date = addDays(start, week * 7 + weekday)
      const day = toISODate(date)
      return {
        day,
        date: date.getDate(),
        inMonth: monthOf(date) === month,
        isToday: day === todayKey,
        isFuture: day > todayKey,
      }
    }),
  )
}

// The most recent workout of both reads (and the queue they already carry), or
// null with none. Both, because the last workout can be older than this month,
// and only the history has it then.
export function latestWorkout(recent: WorkoutRecord[], history: WorkoutRecord[]) {
  return mergeWithPending(recent, history)[0] ?? null
}

export type DayTotal ={ sets: number; workouts: WorkoutRecord[] }

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

// Home's headline: the days with a workout this week against the goal, the
// number of active routines ("2 de 5 treinos", "1 de 1 treino"). Without a goal
// (no active routines, or the routines not known), only the count:
// "2 esta semana", "0 esta semana".
export function formatWeekGoal(days: number, goal: number | null) {
  if (!goal) return `${days} esta semana`
  return `${days} de ${goal} ${goal === 1 ? 'treino' : 'treinos'}`
}

// What screen readers hear once a day is selected: "Terça-feira, 3 de novembro:
// Pull, 12 séries; Push, 6 séries", or "…: sem treino".
export function formatDayAnnouncement(day: string, workouts: WorkoutRecord[]) {
  if (workouts.length === 0) return `${formatDayLabel(day)}: sem treino`
  const lines = workouts.map((record) =>
    [record.routineName, formatSetCount(countRecordSets(record)), record.pending && 'por enviar']
      .filter(Boolean)
      .join(', '),
  )
  return `${formatDayLabel(day)}: ${lines.join('; ')}`
}

// Days with at least one workout, in the totals given (a month's).
export function countTrainingDays(totals: Map<string, DayTotal>) {
  let days = 0
  for (const total of totals.values()) if (total.sets > 0) days++
  return days
}

const monthNameFormat = new Intl.DateTimeFormat('pt-PT', { month: 'long' })

// The calendar's title: "Novembro 2026", without "de".
export function formatMonthTitle(month: Month) {
  const start = monthStart(month)
  return `${capitalize(monthNameFormat.format(start))} ${start.getFullYear()}`
}

// What the calendar says first to screen readers: the month in one sentence,
// before the days with a workout. "Ainda" only for the month still running.
export function formatMonthSummary(month: Month, days: number, today: Date) {
  const name = monthNameFormat.format(monthStart(month))
  if (days > 0) return `Em ${name} treinaste em ${days} ${days === 1 ? 'dia' : 'dias'}.`
  return month === monthOf(today) ? `Em ${name} ainda não treinaste.` : `Em ${name} não treinaste.`
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

// A day of the heatmap ("2026-11-03") as a local date at midnight.
function fromDayKey(day: string) {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(year, month - 1, date)
}

const longDayFormat = new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
const longDayYearFormat = new Intl.DateTimeFormat('pt-PT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// "Terça-feira, 3 de novembro", for the day picked on Home's calendar.
export function formatDayLabel(day: string) {
  return capitalize(longDayFormat.format(fromDayKey(day)))
}

// A heatmap day for screen readers: "Terça-feira, 3 de novembro: 18 séries".
export function formatHeatmapDayLabel(day: string, sets: number) {
  return `${formatDayLabel(day)}: ${sets === 0 ? 'sem treino' : formatSetCount(sets)}`
}

// "terça-feira, 3 de novembro, 19:42", with the year when it is not this one.
export function formatWorkoutDateTime(iso: string, now: Date) {
  const date = new Date(iso)
  const day = date.getFullYear() === now.getFullYear() ? longDayFormat : longDayYearFormat
  return `${day.format(date)}, ${formatClock(iso)}`
}

// "ontem · 1 h 05 min · 4 exercícios · 15 séries", under a history row.
export function formatRecordSummary(record: WorkoutRecord, now: Date) {
  return [
    formatRelativeDay(record.startedAt, now),
    formatRecordDuration(record),
    formatExerciseCount(record.exercises.length),
    formatSetCount(countRecordSets(record)),
  ].join(' · ')
}

// "Ontem · 6 exercícios · 52 min", below the routine in Home's "Último treino".
export function formatLastWorkoutDetails(record: WorkoutRecord, now: Date) {
  return [
    capitalize(formatRelativeDay(record.startedAt, now)),
    formatExerciseCount(record.exercises.length),
    formatRecordDuration(record),
  ].join(' · ')
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

