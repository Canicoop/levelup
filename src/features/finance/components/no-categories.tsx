import type { ReactNode } from 'react'
import { Wallet } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useCreateSuggestedCategories } from '@/features/finance/hooks/use-category-mutations'
import { financeErrorMessage } from '@/features/finance/lib/errors'

// With no categories at all, archived ones included: the suggested ones, with
// one tap, or the user's own. The names are not listed here (step 7.5's
// decision 8). `ownAction` is "Criar as minhas": a link to the categories
// screen on the Finance page, a button that opens "Nova categoria" on that
// screen.
export function NoCategories({ ownAction }: { ownAction: ReactNode }) {
  const create = useCreateSuggestedCategories()

  return (
    <Card>
      <div className="flex flex-col gap-3 px-4">
        <EmptyState
          icon={Wallet}
          title="Ainda não tens categorias"
          description="Cria as categorias sugeridas para começares, ou cria as tuas."
          action={
            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <Button size="lg" disabled={create.isPending} onClick={() => create.mutate()}>
                {create.isPending ? 'A criar…' : 'Criar categorias sugeridas'}
              </Button>
              {ownAction}
            </div>
          }
        />
        {create.error && (
          <p role="alert" className="text-sm text-destructive">
            {financeErrorMessage(create.error)}
          </p>
        )}
      </div>
    </Card>
  )
}
