import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { workoutKeys } from '@/features/workout/api/query-keys'
import { UUID } from '@/features/workout/api/routines'
import { NotFoundError } from '@/features/workout/lib/errors'
import { heatmapStart, inHeatmap, toWorkoutRecord, type WorkoutRecord } from '@/features/workout/lib/history'
import { supabase } from '@/lib/supabase'

// Finished workouts, through the Data API: a workout with its routine, its
// exercises and their sets, in one request. The composite foreign keys are
// named, since `exercises` is reached from two tables. Embedded rows come in no
// set order, so toWorkoutRecord sorts them by position. The API's row limit
// applies to the workouts only, which are at most a few dozen per read.
const WORKOUT_COLUMNS =
  'id, started_at, finished_at, routine:routines!workouts_routine_fkey(name), workout_exercises(exercise_id, position, exercise:exercises!workout_exercises_exercise_fkey(name), workout_sets(position, weight_kg, reps))'

// The workouts of the heatmap's 12 weeks, the most recent first. Read by
// finished_at, which the (user_id, finished_at desc) index serves; one that
// finished in the window but started the day before it is left out.
export async function fetchRecentWorkouts(now = new Date()): Promise<WorkoutRecord[]> {
  const start = heatmapStart(now)
  const { data, error } = await supabase
    .from('workouts')
    .select(WORKOUT_COLUMNS)
    .gte('finished_at', start.toISOString())
    .order('finished_at', { ascending: false })
    .order('id', { ascending: false })
  if (error) throw error
  return inHeatmap(data.map(toWorkoutRecord), now)
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
export function recentWorkoutsOptions() {
  return queryOptions({ queryKey: workoutKeys.recentWorkouts(), queryFn: () => fetchRecentWorkouts() })
}

export function historyOptions() {
  return infiniteQueryOptions({
    queryKey: workoutKeys.history(),
    queryFn: ({ pageParam }) => fetchHistoryPage(pageParam),
    initialPageParam: null as HistoryCursor,
    getNextPageParam: (page) => page.next,
  })
}
