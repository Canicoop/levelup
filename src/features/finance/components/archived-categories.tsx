import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useSetCategoryArchived } from '@/features/finance/hooks/use-category-mutations'
import { compareCategoryNames, type Category } from '@/features/finance/lib/categories'
import { financeErrorMessage } from '@/features/finance/lib/errors'
import { kindLabel } from '@/features/finance/lib/labels'

// Collapsed by default, like the archived exercises (see ArchivedExercises).
// Expense categories first, then income ones, each by name.
export function ArchivedCategories({ archived }: { archived: Category[] }) {
  const [expanded, setExpanded] = useState(false)
  const listId = useId()

  if (archived.length === 0) return null

  const sorted = [...archived].sort(
    (a, b) => (a.kind === b.kind ? 0 : a.kind === 'expense' ? -1 : 1) || compareCategoryNames(a.name, b.name),
  )

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={() => setExpanded((value) => !value)}
        className="-mx-2 flex min-h-11 touch-manipulation items-center gap-1 self-start rounded-lg px-2 text-sm font-medium text-muted-foreground outline-none select-none transition-[opacity,background-color] duration-150 ease-out hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring active:opacity-70 motion-reduce:transition-none"
      >
        Arquivadas ({archived.length})
        <ChevronDown
          aria-hidden
          strokeWidth={1.75}
          className={`size-4 transition-transform duration-150 ease-out motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <Card id={listId} className="gap-0 py-0">
          <ul className="divide-y divide-border">
            {sorted.map((category) => (
              <ArchivedCategoryRow key={category.id} category={category} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

// Its own mutation per row: only the category being reactivated is disabled.
function ArchivedCategoryRow({ category }: { category: Category }) {
  const reactivate = useSetCategoryArchived()

  return (
    <li className="flex flex-col gap-1 px-4 py-2">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <span className="min-w-0 truncate text-base">
          <span className="font-medium">{category.name}</span>
          <span className="text-muted-foreground"> · {kindLabel(category.kind)}</span>
        </span>
        <Button
          variant="outline"
          aria-label={`Reativar: ${category.name}`}
          disabled={reactivate.isPending}
          onClick={() => reactivate.mutate({ id: category.id, archived: false })}
        >
          {reactivate.isPending ? 'A reativar…' : 'Reativar'}
        </Button>
      </div>
      {reactivate.error && (
        <p role="alert" className="text-sm text-destructive">
          {financeErrorMessage(reactivate.error)}
        </p>
      )}
    </li>
  )
}
