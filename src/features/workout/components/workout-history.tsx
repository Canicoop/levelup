import { useId } from 'react'
import { History } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { OfflineState } from '@/components/offline-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { HistoryRow } from '@/features/workout/components/history-row'
import { useWorkoutHistory } from '@/features/workout/hooks/use-workout-history'
import { getErrorMessage } from '@/features/workout/lib/errors'
import { useNow } from '@/hooks/use-now'
import { isWaitingForNetwork } from '@/lib/query-state'

// The "Histórico" section, at the end of the Workout tab: finished workouts, the
// most recent first, 20 at a time, with the ones waiting to be sent marked.
export function WorkoutHistory() {
  const now = useNow()
  const { query, records } = useWorkoutHistory()
  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center">
        <h2 id={titleId} className="text-xl font-semibold tracking-tight">
          Histórico
        </h2>
      </div>

      {/* As in the routine list, the data shows whenever there is some, and the
          states only when there is nothing to show. */}
      {records ? (
        records.length === 0 ? (
          <Card>
            <div className="px-4">
              <EmptyState
                icon={History}
                title="Ainda não registaste nenhum treino"
                description="Os treinos que terminares aparecem aqui."
              />
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            <Card className="gap-0 py-0">
              <ul className="divide-y divide-border">
                {records.map((record) => (
                  <li key={record.id}>
                    <HistoryRow record={record} now={now} />
                  </li>
                ))}
              </ul>
            </Card>
            {query.hasNextPage && (
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                disabled={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
              >
                {query.isFetchingNextPage ? 'A carregar…' : 'Ver mais'}
              </Button>
            )}
            {query.isFetchNextPageError && (
              <p role="alert" className="text-sm text-destructive">
                {getErrorMessage(query.error)}
              </p>
            )}
          </div>
        )
      ) : isWaitingForNetwork(query) ? (
        <OfflineState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : (
        <HistorySkeleton />
      )}
    </section>
  )
}

function HistorySkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">A carregar…</span>
      <Card aria-hidden className="gap-0 py-0">
        <div className="divide-y divide-border">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex min-h-14 flex-col justify-center gap-2 px-4 py-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3.5 w-52" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
