import { useId, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMonthTitle } from '@/features/finance/lib/labels'
import { formatEuros } from '@/features/finance/lib/money'
import { isFutureMonth, shiftMonth, type MonthKey } from '@/features/finance/lib/months'
import { monthTotals, type Transaction } from '@/features/finance/lib/totals'

type MonthCardProps = {
  month: MonthKey
  current: MonthKey
  onMonthChange: (month: MonthKey) => void
  // The month's transactions, or null while they are not known (loading, an
  // error or no network: `state` then takes the summary's place).
  transactions: Transaction[] | null
  state: ReactNode
}

// The month's card: ‹ month › and the summary, the balance large with what came
// in and what went out below it. Earlier months have no limit; › is off on the
// current month. "Registar movimento" joins the card in step 7.5's fourth
// commit, below the summary.
export function MonthCard({ month, current, onMonthChange, transactions, state }: MonthCardProps) {
  const titleId = useId()
  const totals = transactions ? monthTotals(transactions) : null

  return (
    <section aria-labelledby={titleId}>
      <Card>
        <div className="flex flex-col gap-4 px-4">
          <div className="flex items-center justify-between gap-2">
            <MonthButton label="Mês anterior" onClick={() => onMonthChange(shiftMonth(month, -1))}>
              <ChevronLeft aria-hidden className="size-5" strokeWidth={1.75} />
            </MonthButton>
            {/* Read out when the month changes; the buttons keep the focus. */}
            <h2 id={titleId} aria-live="polite" className="text-base font-semibold tracking-tight">
              {formatMonthTitle(month)}
            </h2>
            <MonthButton
              label="Mês seguinte"
              disabled={isFutureMonth(shiftMonth(month, 1), current)}
              onClick={() => onMonthChange(shiftMonth(month, 1))}
            >
              <ChevronRight aria-hidden className="size-5" strokeWidth={1.75} />
            </MonthButton>
          </div>

          {totals ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className="text-4xl font-semibold tracking-tight tabular-nums">{formatEuros(totals.balance)}</p>
              </div>
              <dl className="grid grid-cols-2 gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <dt className="text-sm text-muted-foreground">Entrou</dt>
                  <dd className="text-base font-medium tabular-nums">{formatEuros(totals.income)}</dd>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <dt className="text-sm text-muted-foreground">Saiu</dt>
                  <dd className="text-base font-medium tabular-nums">{formatEuros(totals.expenses)}</dd>
                </div>
              </dl>
            </div>
          ) : (
            state
          )}
        </div>
      </Card>
    </section>
  )
}

// The summary's shape while the month's transactions load.
export function MonthSummarySkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
    </div>
  )
}

function MonthButton({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-full text-muted-foreground outline-none select-none transition-[opacity,background-color,color] duration-150 ease-out hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring active:opacity-70 disabled:pointer-events-none disabled:opacity-30 motion-reduce:transition-none"
    >
      {children}
    </button>
  )
}
