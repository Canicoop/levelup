import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Category } from '@/features/finance/lib/categories'
import { formatSignedAmount, formatTransactionDay, groupByDay, kindLabel } from '@/features/finance/lib/labels'
import type { Transaction } from '@/features/finance/lib/totals'
import type { DayKey } from '@/lib/lisbon-day'

// Rows shown at first and added by each "Ver mais". The whole month is already
// in memory, so "Ver mais" asks for nothing; it only keeps a busy month from
// becoming one very long page, as the Weight module's history.
const PAGE_SIZE = 30

type TransactionListProps = {
  // The month's transactions, in the list's order (sortTransactions).
  transactions: Transaction[]
  categories: Category[]
  today: DayKey
}

// The month's transactions, grouped by day, the newest first. Each day has a
// heading without a total. Rows open their sheet in step 7.5's fourth commit.
export function TransactionList({ transactions, categories, today }: TransactionListProps) {
  const [shown, setShown] = useState(PAGE_SIZE)
  const names = new Map(categories.map((category) => [category.id, category.name]))
  const groups = groupByDay(transactions.slice(0, shown))

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <DayGroup key={group.day} day={group.day} today={today} transactions={group.transactions} names={names} />
      ))}
      {transactions.length > shown && (
        <Button variant="outline" size="lg" className="w-full" onClick={() => setShown((count) => count + PAGE_SIZE)}>
          Ver mais
        </Button>
      )}
    </div>
  )
}

function DayGroup({
  day,
  today,
  transactions,
  names,
}: {
  day: DayKey
  today: DayKey
  transactions: Transaction[]
  names: Map<string, string>
}) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="text-sm font-medium text-muted-foreground">
        {formatTransactionDay(day, today)}
      </h3>
      <Card className="gap-0 py-0">
        <ul className="divide-y divide-border">
          {transactions.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              category={names.get(transaction.categoryId) ?? null}
            />
          ))}
        </ul>
      </Card>
    </section>
  )
}

// The category, and below it the merchant or, without one, the note, cut with
// "…" when long. The amount has its sign, in the text's colour; screen readers
// hear "Despesa" or "Receita" before it.
function TransactionRow({ transaction, category }: { transaction: Transaction; category: string | null }) {
  const detail = transaction.merchant ?? transaction.note

  return (
    <li className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-base font-medium">{category ?? 'Sem categoria'}</span>
        {detail && <span className="truncate text-sm text-muted-foreground">{detail}</span>}
      </span>
      <span className="shrink-0 text-base font-medium whitespace-nowrap tabular-nums">
        <span className="sr-only">{kindLabel(transaction.kind)}: </span>
        {formatSignedAmount(transaction)}
      </span>
    </li>
  )
}

export function TransactionListSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-2">
      <Skeleton className="h-4 w-16" />
      <Card className="gap-0 py-0">
        <div className="divide-y divide-border">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3.5 w-20" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
