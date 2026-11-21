import { useQueryClient, type QueryKey } from '@tanstack/react-query'

// Every Finance write asks again for its own key once it settles, success or
// failure, as in the Weight and Workout modules: on success the mutation stays
// pending until the new read ends, so the screen never shows the old state as
// saved; on failure the error shows at once and the read runs in the
// background. Only reads with a screen open are fetched again; the others are
// marked stale.
export function useRefetchFinance(queryKey: QueryKey) {
  const queryClient = useQueryClient()
  return (_data: unknown, error: Error | null) => {
    const refetch = queryClient.invalidateQueries({ queryKey })
    return error ? undefined : refetch
  }
}
