import { useEffect, useState } from 'react'
import { Scale } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { PageHeader } from '@/components/layout/page-header'
import { OfflineState } from '@/components/offline-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PeriodFilter } from '@/features/weight/components/period-filter'
import { WeightChart } from '@/features/weight/components/weight-chart'
import { WeightEntrySheet, type WeightSheetTarget } from '@/features/weight/components/weight-entry-sheet'
import { WeightHistory, WeightHistorySkeleton } from '@/features/weight/components/weight-history'
import { WeightSummary, WeightSummarySkeleton } from '@/features/weight/components/weight-summary'
import { useWeightEntries } from '@/features/weight/hooks/use-weight-entries'
import { canEdit, newestFirst, todayEntry, type WeightEntry } from '@/features/weight/lib/entries'
import { lisbonToday } from '@/features/weight/lib/lisbon-day'
import type { Period } from '@/features/weight/lib/periods'
import { wantsRegister } from '@/features/weight/lib/register-intent'
import { useNow } from '@/hooks/use-now'
import { isWaitingForNetwork } from '@/lib/query-state'

export function WeightPage() {
  // "Today" moves on by itself at midnight (useNow ticks every minute and when
  // the app comes back to the foreground).
  const now = useNow()
  const today = lisbonToday(now)
  const query = useWeightEntries()
  const entries = query.data

  // Always 1M when the page opens; not remembered.
  const [period, setPeriod] = useState<Period>('1M')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [target, setTarget] = useState<WeightSheetTarget | null>(null)

  // The day is read when the sheet opens, not from `now`, which can be up to a
  // minute old.
  function openSheet(next: (openedOn: string) => WeightSheetTarget) {
    setTarget(next(lisbonToday(new Date())))
    setSheetOpen(true)
  }

  // The sheet for today: logging, or editing when there is already an entry
  // (logged meanwhile on another device, for one).
  const todaySheet = (list: WeightEntry[], openedOn: string): WeightSheetTarget => {
    const logged = todayEntry(list, openedOn)
    return logged
      ? { kind: 'today', openedOn, entry: logged }
      : { kind: 'new', openedOn, placeholder: newestFirst(list)[0]?.tenths ?? null }
  }

  const register = () =>
    openSheet((openedOn) => ({
      kind: 'new',
      openedOn,
      placeholder: entries ? (newestFirst(entries)[0]?.tenths ?? null) : null,
    }))

  const openEntry = (entry: WeightEntry) =>
    openSheet((openedOn) => ({ kind: canEdit(entry, openedOn) ? 'today' : 'past', openedOn, entry }))

  // Home's "Registar peso" (see register-intent.ts): once the entries are
  // known, open today's sheet, once per navigation (the location's key).
  // While a read is on its way the entries may be the device's copy, and
  // miss an entry logged today on another device, so it waits for that read;
  // without network the read pauses and the copy is used. The day is read now,
  // not from `today`, which can be a minute old. Adjusted during render, as
  // React advises for state that follows other values; the request is then
  // cleared with replace, so going back or reloading does not open it again.
  const location = useLocation()
  const navigate = useNavigate()
  const fromHome = wantsRegister(location.state)
  const reading = query.fetchStatus === 'fetching'
  const [handledKey, setHandledKey] = useState<string | null>(null)
  if (fromHome && entries && !reading && handledKey !== location.key) {
    setHandledKey(location.key)
    setTarget(todaySheet(entries, lisbonToday(new Date())))
    setSheetOpen(true)
  }
  useEffect(() => {
    if (fromHome && handledKey === location.key) {
      void navigate(location.pathname, { replace: true, state: null })
    }
  }, [fromHome, handledKey, location.key, location.pathname, navigate])

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
            {/* The filter scopes the summary and the chart; the history below
                is never filtered. */}
            <div className="flex flex-col gap-3">
              <PeriodFilter value={period} onChange={setPeriod} />
              <WeightSummary
                entries={entries}
                period={period}
                today={today}
                onRegister={register}
                onEditToday={openEntry}
              />
              <WeightChart entries={entries} period={period} today={today} />
            </div>
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
