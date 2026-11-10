import { QueryClient } from '@tanstack/react-query'

// Only staleTime and the mutations' networkMode differ from TanStack Query's
// defaults. The rest is kept on purpose: three retries with backoff on queries
// (gym connections drop), refetch on focus and on reconnect, and errors shown
// in the page (ErrorState) rather than thrown to the route's error boundary.
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
      // Try even when the browser reports no network, so the write fails at
      // once and the error shows. By default it would pause until the network
      // is back: the button stays on "A guardar…" and the sheet cannot close.
      networkMode: 'always',
    },
  },
})

// The Workout reads are kept on the device (see QueryProvider), so they must
// stay in memory as long as the copy lasts, even when no screen uses them, or
// they would leave the copy. Infinity, not QUERY_CACHE_MAX_AGE_MS: 30 days is
// above setTimeout's limit (about 24.8 days), and a longer timeout fires at
// once, which removed these queries a millisecond after they were set. Their
// age is still limited by the copy's maxAge.
queryClient.setQueryDefaults(['workout'], { gcTime: Infinity })
