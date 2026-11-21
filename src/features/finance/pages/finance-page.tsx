import { useId, useState } from 'react'
import { cn } from 'cn'
import { Link } from 'react-router'
import { ErrorState } from '@/components/error-state'
import { PageHeader } from '@/components/layout/page-header'
import { OfflineState } from '@/components/offline-state'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MonthCard, MonthSummarySkeleton } from '@/features/finance/components/month-card'
import { NoCategories } from '@/features/finance/components/no-categories'
import { TransactionList, TransactionListSkeleton } from '@/features/finance/components/transaction-list'
import { useCategories, useMonthTransactions } from '@/features/finance/hooks/use-finance-queries'
import { shouldOfferSuggestions, type Category } from '@/features/finance/lib/categories'
import { formatEmptyMonth } from '@/features/finance/lib/labels'
import { followCurrentMonth, monthOfDay, type MonthKey } from '@/features/finance/lib/months'
import { useNow } from '@/hooks/use-now'
import { lisbonToday, type DayKey } from '@/lib/lisbon-day'
import { isWaitingForNetwork } from '@/lib/query-state'

// The Finance page. In order: the header (with "Categorias"), the month's card
// (navigation and summary; "Registar movimento" joins it in step 7.5's fourth
// commit), then the budget (step 7.6), spending by category (step 7.7),
// subscriptions (step 7.8) and the month's transactions. The month chosen in
// the card scopes everything below it.
export function FinancePage() {
  // "Today" and the current month are Lisbon's, and move on by themselves
  // (useNow ticks every minute and when the app comes back to the foreground).
  const now = useNow()
  const today = lisbonToday(now)
  const current = monthOfDay(today)

  // The page opens on the current month. A new month while the app stayed open
  // moves a page on the month that was current to the new one; a page the user
  // moved to another month stays there. Adjusted while rendering, as React
  // suggests for state that follows other values (as Home's calendar).
  const [month, setMonth] = useState<MonthKey>(current)
  const [seenCurrent, setSeenCurrent] = useState<MonthKey>(current)
  if (seenCurrent !== current) {
    setSeenCurrent(current)
    const next = followCurrentMonth(month, seenCurrent, current)
    if (next !== month) setMonth(next)
  }

  const categories = useCategories()
  const list = categories.data

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Finanças">
        {list && !shouldOfferSuggestions(list) && (
          // cn() merges the variant's border-border over the base's
          // border-transparent, as Button does; without it the outline is lost.
          <Link to="/financas/categorias" className={cn(buttonVariants({ variant: 'outline' }))}>
            Categorias
          </Link>
        )}
      </PageHeader>

      {/* As elsewhere, the data shows whenever there is some, and the states
          only when there is nothing to show. The list needs the categories'
          names, so the month waits for them. */}
      {list ? (
        shouldOfferSuggestions(list) ? (
          <NoCategories
            ownAction={
              <Link to="/financas/categorias" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
                Criar as minhas
              </Link>
            }
          />
        ) : (
          <MonthView month={month} current={current} today={today} categories={list} onMonthChange={setMonth} />
        )
      ) : isWaitingForNetwork(categories) ? (
        <OfflineState />
      ) : categories.isError ? (
        <ErrorState onRetry={() => void categories.refetch()} />
      ) : (
        <FinanceSkeleton />
      )}
    </div>
  )
}

// One month: its card and its transactions. A month that cannot be read shows
// its state inside the card, below the navigation, so another month can still
// be chosen; the list then stays out.
function MonthView({
  month,
  current,
  today,
  categories,
  onMonthChange,
}: {
  month: MonthKey
  current: MonthKey
  today: DayKey
  categories: Category[]
  onMonthChange: (month: MonthKey) => void
}) {
  const transactions = useMonthTransactions(month)
  const data = transactions.data
  const titleId = useId()

  const waiting = isWaitingForNetwork(transactions)
  const failed = !data && transactions.isError
  const state = waiting ? (
    <OfflineState />
  ) : failed ? (
    <ErrorState onRetry={() => void transactions.refetch()} />
  ) : (
    <div aria-busy="true">
      <span className="sr-only">A carregar…</span>
      <MonthSummarySkeleton />
    </div>
  )

  const empty = formatEmptyMonth(month, current)

  return (
    <>
      <MonthCard
        month={month}
        current={current}
        onMonthChange={onMonthChange}
        transactions={data ?? null}
        state={state}
      />

      {!waiting && !failed && (
        <section aria-labelledby={titleId} className="flex flex-col gap-3">
          <h2 id={titleId} className="text-xl font-semibold tracking-tight">
            Movimentos
          </h2>
          {!data ? (
            <TransactionListSkeleton />
          ) : data.length === 0 ? (
            <div className="flex flex-col gap-1">
              <p className="text-sm text-pretty text-muted-foreground">{empty.title}</p>
              {empty.hint && <p className="text-sm text-pretty text-muted-foreground">{empty.hint}</p>}
            </div>
          ) : (
            // A new month starts again from the first 30 rows.
            <TransactionList key={month} transactions={data} categories={categories} today={today} />
          )}
        </section>
      )}
    </>
  )
}

// The month's card and three rows, while the categories load.
function FinanceSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <span className="sr-only">A carregar…</span>
      <Card aria-hidden>
        <div className="flex flex-col gap-4 px-4">
          <div className="flex min-h-11 items-center justify-center">
            <Skeleton className="h-5 w-32" />
          </div>
          <MonthSummarySkeleton />
        </div>
      </Card>
      <div aria-hidden className="flex flex-col gap-3">
        <Skeleton className="h-6 w-28" />
        <TransactionListSkeleton />
      </div>
    </div>
  )
}
