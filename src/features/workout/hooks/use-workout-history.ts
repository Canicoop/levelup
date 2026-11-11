import { useMemo } from 'react'
import { useInfiniteQuery, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { fetchWorkout, historyOptions, recentWorkoutsOptions, type HistoryPage } from '@/features/workout/api/history'
import { workoutKeys } from '@/features/workout/api/query-keys'
import { usePendingWorkouts } from '@/features/workout/hooks/use-finished-workouts'
import { NotFoundError } from '@/features/workout/lib/errors'
import { mergeWithPending, pendingAsRecords, type WorkoutRecord } from '@/features/workout/lib/history'

// The reads of finished workouts, with the ones waiting to be sent laid over
// them (rule AY). The queue has its own store, so a workout shows at once, and
// loses "Por enviar" when it leaves the queue, without a request.

function usePendingRecords() {
  const queue = usePendingWorkouts()
  return useMemo(() => pendingAsRecords(queue), [queue])
}

// The heatmap's 12 weeks (and Home's card). `records` is undefined until the
// read has data, from the network or the copy on the device.
export function useRecentWorkouts() {
  const query = useQuery(recentWorkoutsOptions())
  const pending = usePendingRecords()
  const records = useMemo(() => (query.data ? mergeWithPending(query.data, pending) : undefined), [query.data, pending])
  return { query, records }
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

// A workout already read with the recent workouts or the history.
function findCachedWorkout(queryClient: QueryClient, id: string) {
  const recent = queryClient.getQueryData<WorkoutRecord[]>(workoutKeys.recentWorkouts())
  const history = queryClient.getQueryData<{ pages: HistoryPage[] }>(workoutKeys.history())
  return (
    recent?.find((record) => record.id === id) ??
    history?.pages.flatMap((page) => page.records).find((record) => record.id === id)
  )
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
