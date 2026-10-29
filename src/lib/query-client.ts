import { QueryClient } from '@tanstack/react-query'

// Only staleTime differs from TanStack Query's defaults. The rest is kept on
// purpose: three retries with backoff on queries (gym connections drop),
// refetch on focus and on reconnect, and errors shown in the page (ErrorState)
// rather than thrown to the route's error boundary.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data only changes through the user's own actions, which invalidate the
      // affected queries. A minute avoids refetching on every tab switch.
      staleTime: 60_000,
    },
    mutations: {
      // Never retry a write automatically: it could save the same record twice
      // (an expense, a set). This is the library default, written out so it is
      // not changed by accident.
      retry: 0,
    },
  },
})
