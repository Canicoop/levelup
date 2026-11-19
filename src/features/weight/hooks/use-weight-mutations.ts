import { useMutation, useQueryClient } from '@tanstack/react-query'
import { weightKeys } from '@/features/weight/api/query-keys'
import { deleteWeightEntry, saveTodayWeight } from '@/features/weight/api/weight-entries'
import type { Tenths } from '@/features/weight/lib/weight-values'
import type { DayKey } from '@/lib/lisbon-day'

// Every write refetches the Weight reads once it settles, success or failure,
// as in the Workout module (see use-exercise-mutations.ts): on success the
// mutation stays pending until the refetch ends, so the screen never shows the
// old state as saved; on failure the error shows at once and the refetch runs
// in the background.
function useRefetchWeight() {
  const queryClient = useQueryClient()
  return (_data: unknown, error: Error | null) => {
    const refetch = queryClient.invalidateQueries({ queryKey: weightKeys.all })
    return error ? undefined : refetch
  }
}

// `openedOn` is Lisbon's day when the sheet opened (see saveTodayWeight).
export function useSaveTodayWeight() {
  const refetch = useRefetchWeight()
  return useMutation({
    mutationFn: ({ tenths, openedOn }: { tenths: Tenths; openedOn: DayKey }) => saveTodayWeight(tenths, openedOn),
    onSettled: refetch,
  })
}

export function useDeleteWeightEntry() {
  const refetch = useRefetchWeight()
  return useMutation({
    mutationFn: (id: string) => deleteWeightEntry(id),
    onSettled: refetch,
  })
}
