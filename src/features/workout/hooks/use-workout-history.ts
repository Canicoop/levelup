import { useMemo } from 'react'
import { useInfiniteQuery, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  fetchWorkout,
  firstWorkoutMonthOptions,
  historyOptions,
  monthWorkoutsOptions,
  type HistoryPage,
} from '@/features/workout/api/history'
import { workoutKeys } from '@/features/workout/api/query-keys'
import { usePendingWorkouts } from '@/features/workout/hooks/use-finished-workouts'
import { NotFoundError } from '@/features/workout/lib/errors'
import { inMonth, mergeWithPending, pendingAsRecords, type Month, type WorkoutRecord } from '@/features/workout/lib/history'

// The reads of finished workouts, with the ones waiting to be sent laid over
// them (rule AY). The queue has its own store, so a workout shows at once, and
// loses "Por enviar" when it leaves the queue, without a request.

function usePendingRecords() {
  const queue = usePendingWorkouts()
  return useMemo(() => pendingAsRecords(queue), [queue])
}

// One month of Home's calendar, with the waiting workouts that started in it.
// `records` is undefined until the read has data, from the network or the copy
// on the device.
export function useMonthWorkouts(month: Month) {
  const query = useQuery(monthWorkoutsOptions(month))
  const pending = usePendingRecords()
  const records = useMemo(
    () => (query.data ? mergeWithPending(query.data, inMonth(pending, month)) : undefined),
    [query.data, pending, month],
  )
  return { query, records }
}

// The month of the first workout ever (null with none), where the calendar's ‹
// stops. Undefined until known.
export function useFirstWorkoutMonth() {
  return useQuery(firstWorkoutMonthOptions())
}

// The history, 20 at a time ("Ver mais" is fetchNextPage).
export function useWorkoutHistory() {
  const query = useInfiniteQuery(historyOptions())
  const pending = usePendingRecords()
  const records = useMemo(
    () => (query.data ? mergeWithPending(query.data.pages.flatMap((page) => page.records), pending) : undefined),
    [query.data, pending],
  )
  return { query, records }
}

// A workout already read with a month or the history.
function findCachedWorkout(queryClient: QueryClient, id: string) {
  for (const [, records] of queryClient.getQueriesData<WorkoutRecord[]>({ queryKey: workoutKeys.months() })) {
    const found = records?.find((record) => record.id === id)
    if (found) return found
  }
  const history = queryClient.getQueryData<{ pages: HistoryPage[] }>(workoutKeys.history())
  return history?.pages.flatMap((page) => page.records).find((record) => record.id === id)
}

// One workout, for its detail (rule AV): from the queue when it is waiting,
// otherwise from the reads already on the device, and only otherwise from the
// network. A finished workout does not change, so it is never refetched (see
// query-client.ts).
export function useWorkoutDetail(id: string) {
  const queryClient = useQueryClient()
  const pending = usePendingRecords()
  const fromQueue = pending.find((record) => record.id === id)
  const query = useQuery({
    queryKey: workoutKeys.workoutDetail(id),
    queryFn: () => fetchWorkout(id),
    enabled: !fromQueue,
    initialData: () => findCachedWorkout(queryClient, id),
    // A workout that does not exist will not exist on a retry either.
    retry: (failures, error) => !(error instanceof NotFoundError) && failures < 3,
  })
  return { query, record: fromQueue ?? query.data }
}
