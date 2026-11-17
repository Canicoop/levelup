import { useState } from 'react'
import { Scale } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { PageHeader } from '@/components/layout/page-header'
import { OfflineState } from '@/components/offline-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { WeightEntrySheet, type WeightSheetTarget } from '@/features/weight/components/weight-entry-sheet'
import { WeightHistory, WeightHistorySkeleton } from '@/features/weight/components/weight-history'
import { WeightSummary, WeightSummarySkeleton } from '@/features/weight/components/weight-summary'
import { useWeightEntries } from '@/features/weight/hooks/use-weight-entries'
import { canEdit, newestFirst, type WeightEntry } from '@/features/weight/lib/entries'
import { lisbonToday } from '@/features/weight/lib/lisbon-day'
import { useNow } from '@/hooks/use-now'
import { isWaitingForNetwork } from '@/lib/query-state'

export function WeightPage() {
  // "Today" moves on by itself at midnight (useNow ticks every minute and when
  // the app comes back to the foreground).
  const now = useNow()
  const today = lisbonToday(now)
  const query = useWeightEntries()
  const entries = query.data

  const [sheetOpen, setSheetOpen] = useState(false)
  const [target, setTarget] = useState<WeightSheetTarget | null>(null)

  // The day is read when the sheet opens, not from `now`, which can be up to a
  // minute old.
  function openSheet(next: (openedOn: string) => WeightSheetTarget) {
    setTarget(next(lisbonToday(new Date())))
    setSheetOpen(true)
  }

  const register = () =>
    openSheet((openedOn) => ({
      kind: 'new',
      openedOn,
      placeholder: entries ? (newestFirst(entries)[0]?.tenths ?? null) : null,
    }))

  const openEntry = (entry: WeightEntry) =>
    openSheet((openedOn) => ({ kind: canEdit(entry, openedOn) ? 'today' : 'past', openedOn, entry }))

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Peso" />

      {/* As elsewhere, the data shows whenever there is some, and the states
          only when there is nothing to show. */}
      {entries ? (
        entries.length === 0 ? (
          <Card>
            <div className="px-4">
              <EmptyState
                icon={Scale}
                title="Ainda não registaste o teu peso"
                description="Regista o peso de hoje para começares a ver a evolução."
                action={
                  <Button size="lg" onClick={register}>
                    Registar peso
                  </Button>
                }
              />
            </div>
          </Card>
        ) : (
          <>
            <WeightSummary entries={entries} today={today} onRegister={register} onEditToday={openEntry} />
            <WeightHistory entries={entries} today={today} onOpen={openEntry} />
          </>
        )
      ) : isWaitingForNetwork(query) ? (
        <OfflineState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : (
        <div aria-busy="true" className="flex flex-col gap-8">
          <span className="sr-only">A carregar…</span>
          <WeightSummarySkeleton />
          <WeightHistorySkeleton />
        </div>
      )}

      <WeightEntrySheet open={sheetOpen} onOpenChange={setSheetOpen} target={target} />
    </div>
  )
}
