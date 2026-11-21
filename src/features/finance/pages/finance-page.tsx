import { Link } from 'react-router'
import { ErrorState } from '@/components/error-state'
import { PageHeader } from '@/components/layout/page-header'
import { OfflineState } from '@/components/offline-state'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { NoCategories } from '@/features/finance/components/no-categories'
import { useCategories } from '@/features/finance/hooks/use-finance-queries'
import { shouldOfferSuggestions } from '@/features/finance/lib/categories'
import { isWaitingForNetwork } from '@/lib/query-state'

// The Finance page. In order: the header (with "Categorias"), the month's card
// (navigation, summary and "Registar movimento"), then the budget (step 7.6),
// spending by category (step 7.7), subscriptions (step 7.8) and the month's
// transactions. This commit has the header and the page's states; the month's
// card and the list come with step 7.5's third commit.
export function FinancePage() {
  const categories = useCategories()
  const list = categories.data

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Finanças">
        {list && !shouldOfferSuggestions(list) && (
          <Link to="/financas/categorias" className={buttonVariants({ variant: 'outline' })}>
            Categorias
          </Link>
        )}
      </PageHeader>

      {/* As elsewhere, the data shows whenever there is some, and the states
          only when there is nothing to show. */}
      {list ? (
        shouldOfferSuggestions(list) && (
          <NoCategories
            ownAction={
              <Link to="/financas/categorias" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                Criar as minhas
              </Link>
            }
          />
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

// The month's card and three rows, as the page will show them (step 7.5's
// third commit).
function FinanceSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <span className="sr-only">A carregar…</span>
      <Card aria-hidden>
        <div className="flex flex-col gap-4 px-4">
          <div className="flex min-h-11 items-center justify-center">
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-40" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-9 w-full pointer-coarse:h-11" />
        </div>
      </Card>
      <Card aria-hidden className="gap-0 py-0">
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
