import { useRef, useState, type RefObject } from 'react'
import { BottomSheet } from '@/components/bottom-sheet'
import { CategoryNameForm } from '@/features/finance/components/category-name-form'
import { KindToggle } from '@/features/finance/components/kind-toggle'
import { useCreateCategory } from '@/features/finance/hooks/use-category-mutations'
import type { Category, Kind } from '@/features/finance/lib/categories'

type CreateCategorySheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Every category, archived included: an archived one of the same kind with
  // the same name is reactivated instead (see createCategory).
  categories: Category[]
}

// "Nova categoria": the kind and the name. The field takes the focus: creating
// was asked for.
export function CreateCategorySheet({ open, onOpenChange, categories }: CreateCategorySheetProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Nova categoria" initialFocus={inputRef}>
      <CreateCategoryForm inputRef={inputRef} categories={categories} onDone={() => onOpenChange(false)} />
    </BottomSheet>
  )
}

function CreateCategoryForm({
  inputRef,
  categories,
  onDone,
}: {
  inputRef: RefObject<HTMLInputElement | null>
  categories: Category[]
  onDone: () => void
}) {
  const create = useCreateCategory()
  const [kind, setKind] = useState<Kind>('expense')

  return (
    <div className="flex flex-col gap-4">
      <KindToggle
        value={kind}
        disabled={create.isPending}
        onChange={(next) => {
          setKind(next)
          create.reset()
        }}
      />
      <CategoryNameForm
        inputRef={inputRef}
        submitLabel="Criar"
        pendingLabel="A criar…"
        isPending={create.isPending}
        error={create.error}
        onEdit={create.reset}
        onSave={(name) => create.mutate({ kind, name, categories }, { onSuccess: onDone })}
      />
    </div>
  )
}
