import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { workoutKeys } from '@/features/workout/api/query-keys'
import { NotFoundError } from '@/features/workout/lib/errors'
import {
  inMonth,
  monthOf,
  monthReadRange,
  toWorkoutRecord,
  type Month,
  type WorkoutRecord,
} from '@/features/workout/lib/history'
import { UUID } from '@/features/workout/lib/uuid'
import { supabase } from '@/lib/supabase'

// Finished workouts, through the Data API: a workout with its routine, its
// exercises and their sets, in one request. The composite foreign keys are
// named, since `exercises` is reached from two tables. Embedded rows come in no
// set order, so toWorkoutRecord sorts them by position. The API's row limit
// applies to the workouts only, which are at most a few dozen per read.
const WORKOUT_COLUMNS =
  'id, started_at, finished_at, routine:routines!workouts_routine_fkey(name), workout_exercises(exercise_id, position, exercise:exercises!workout_exercises_exercise_fkey(name), workout_sets(position, weight_kg, reps))'

// The workouts of one month of Home's calendar, the most recent first. Read by
// finished_at, which the (user_id, finished_at desc) index serves, up to a day
// past the month (monthReadRange), then kept to the ones that started in it.
export async function fetchMonthWorkouts(month: Month): Promise<WorkoutRecord[]> {
  const { from, until } = monthReadRange(month)
  const { data, error } = await supabase
    .from('workouts')
    .select(WORKOUT_COLUMNS)
    .gte('finished_at', from.toISOString())
    .lt('finished_at', until.toISOString())
    .order('finished_at', { ascending: false })
    .order('id', { ascending: false })
  if (error) throw error
  return inMonth(data.map(toWorkoutRecord), month)
}

// The month of the first workout ever, where the calendar's ‹ stops, or null
// with none yet. One row, the oldest by finished_at, through the same index.
export async function fetchFirstWorkoutMonth(): Promise<Month | null> {
  const { data, error } = await supabase
    .from('workouts')
    .select('started_at')
    .order('finished_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? monthOf(new Date(data.started_at)) : null
}

export const HISTORY_PAGE_SIZE = 20

// Where the next page starts: after this workout, in (finished_at, id) order. A
// cursor rather than an offset, so a workout that arrives meanwhile does not
// shift the pages and repeat one.
export type HistoryCursor = { finishedAt: string; id: string } | null
export type HistoryPage = { records: WorkoutRecord[]; next: HistoryCursor }

export async function fetchHistoryPage(cursor: HistoryCursor): Promise<HistoryPage> {
  let query = supabase
    .from('workouts')
    .select(WORKOUT_COLUMNS)
    .order('finished_at', { ascending: false })
    .order('id', { ascending: false })
    // One more than a page, to know whether there is another.
    .limit(HISTORY_PAGE_SIZE + 1)
  if (cursor) {
    query = query.or(
      `finished_at.lt.${cursor.finishedAt},and(finished_at.eq.${cursor.finishedAt},id.lt.${cursor.id})`,
    )
  }
  const { data, error } = await query
  if (error) throw error

  const records = data.slice(0, HISTORY_PAGE_SIZE).map(toWorkoutRecord)
  const last = records.at(-1)
  const next = data.length > HISTORY_PAGE_SIZE && last ? { finishedAt: last.finishedAt, id: last.id } : null
  return { records, next }
}

// One workout, when it is in neither read above (see useWorkoutDetail).
export async function fetchWorkout(id: string): Promise<WorkoutRecord> {
  // A mistyped address is not a workout: no request needed, and it works offline.
  if (!UUID.test(id)) throw new NotFoundError()
  const { data, error } = await supabase.from('workouts').select(WORKOUT_COLUMNS).eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) throw new NotFoundError()
  return toWorkoutRecord(data)
}

// Shared by the screens and the background preparation, so both read the same
// way into the same keys.
export function monthWorkoutsOptions(month: Month) {
  return queryOptions({ queryKey: workoutKeys.monthWorkouts(month), queryFn: () => fetchMonthWorkouts(month) })
}

export function firstWorkoutMonthOptions() {
  return queryOptions({ queryKey: workoutKeys.firstWorkoutMonth(), queryFn: fetchFirstWorkoutMonth })
}

export function historyOptions() {
  return infiniteQueryOptions({
    queryKey: workoutKeys.history(),
    queryFn: ({ pageParam }) => fetchHistoryPage(pageParam),
    initialPageParam: null as HistoryCursor,
    getNextPageParam: (page) => page.next,
  })
}
