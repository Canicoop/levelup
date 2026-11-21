import { useId, useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { ErrorState } from '@/components/error-state'
import { PageHeader } from '@/components/layout/page-header'
import { OfflineState } from '@/components/offline-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArchivedCategories } from '@/features/finance/components/archived-categories'
import { CategorySheet } from '@/features/finance/components/category-sheet'
import { CreateCategorySheet } from '@/features/finance/components/create-category-sheet'
import { NoCategories } from '@/features/finance/components/no-categories'
import { useCategories } from '@/features/finance/hooks/use-finance-queries'
import { activeCategories, shouldOfferSuggestions, type Category, type Kind } from '@/features/finance/lib/categories'
import { isWaitingForNetwork } from '@/lib/query-state'

const BACK = { to: '/financas', label: 'Voltar às Finanças' }

// Every category: the active ones by kind ("Despesas", "Receitas"), by name
// with "Outros" last, and the archived ones collapsed. Create, rename, remove
// (delete or archive) and reactivate.
export function CategoriesPage() {
  const categories = useCategories()
  const [creating, setCreating] = useState(false)
  // Kept while the sheet closes; `open` alone controls it (see ExercisesPage).
  const [selected, setSelected] = useState<Category | null>(null)
  const [open, setOpen] = useState(false)

  const all = categories.data
  const archived = all?.filter((category) => category.archivedAt !== null) ?? []

  const openCategory = (category: Category) => {
    setSelected(category)
    setOpen(true)
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Categorias" back={BACK}>
        {all && !shouldOfferSuggestions(all) && (
          <Button variant="outline" onClick={() => setCreating(true)}>
            <Plus aria-hidden data-icon="inline-start" />
            Nova
          </Button>
        )}
      </PageHeader>

      {/* As elsewhere, the data shows whenever there is some, and the states
          only when there is nothing to show. */}
      {all ? (
        shouldOfferSuggestions(all) ? (
          <NoCategories
            ownAction={
              <Button variant="outline" size="lg" onClick={() => setCreating(true)}>
                Criar as minhas
              </Button>
            }
          />
        ) : (
          <>
            <CategorySection title="Despesas" kind="expense" categories={all} onOpen={openCategory} />
            <CategorySection title="Receitas" kind="income" categories={all} onOpen={openCategory} />
            <ArchivedCategories archived={archived} />
          </>
        )
      ) : isWaitingForNetwork(categories) ? (
        <OfflineState />
      ) : categories.isError ? (
        <ErrorState onRetry={() => void categories.refetch()} />
      ) : (
        <CategoriesSkeleton />
      )}

      <CreateCategorySheet open={creating} onOpenChange={setCreating} categories={all ?? []} />
      <CategorySheet open={open} onOpenChange={setOpen} category={selected} categories={all ?? []} />
    </div>
  )
}

function CategorySection({
  title,
  kind,
  categories,
  onOpen,
}: {
  title: string
  kind: Kind
  categories: Category[]
  onOpen: (category: Category) => void
}) {
  const titleId = useId()
  const active = activeCategories(categories, kind)

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <h2 id={titleId} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {active.length === 0 ? (
        <p className="text-sm text-pretty text-muted-foreground">
          {kind === 'expense' ? 'Ainda não tens categorias de despesa.' : 'Ainda não tens categorias de receita.'}
        </p>
      ) : (
        <Card className="gap-0 py-0">
          <ul className="divide-y divide-border">
            {active.map((category) => (
              <li key={category.id}>
                {/* The ring is inset: the card clips anything outside it. */}
                <button
                  type="button"
                  onClick={() => onOpen(category)}
                  className="flex min-h-12 w-full touch-manipulation items-center gap-3 px-4 py-2 text-left outline-none select-none transition-[opacity,background-color] duration-150 ease-out hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset active:opacity-70 motion-reduce:transition-none"
                >
                  <span className="min-w-0 flex-1 text-base font-medium wrap-break-word">{category.name}</span>
                  <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  )
}

function CategoriesSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <span className="sr-only">A carregar…</span>
      {[5, 2].map((rows, section) => (
        <div key={section} aria-hidden className="flex flex-col gap-3">
          <Skeleton className="h-6 w-28" />
          <Card className="gap-0 py-0">
            <div className="divide-y divide-border">
              {Array.from({ length: rows }, (_, row) => (
                <div key={row} className="flex min-h-12 items-center px-4 py-2">
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      ))}
    </div>
  )
}
