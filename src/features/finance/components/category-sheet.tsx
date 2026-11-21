import { useRef, useState, type RefObject } from 'react'
import { BottomSheet } from '@/components/bottom-sheet'
import { useSheetBusy } from '@/components/sheet-busy'
import { Button } from '@/components/ui/button'
import { CategoryNameForm } from '@/features/finance/components/category-name-form'
import { useRemoveCategory, useRenameCategory } from '@/features/finance/hooks/use-category-mutations'
import type { Category } from '@/features/finance/lib/categories'
import { financeErrorMessage } from '@/features/finance/lib/errors'

type CategorySheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Kept by the caller while the sheet closes, so its content does not vanish
  // during the slide down.
  category: Category | null
  // Every category, archived included, to refuse a name another one of the kind has.
  categories: Category[]
}

// One category on the categories screen: rename it, or remove it after a
// confirmation in the same sheet. Removing deletes it, or archives it when
// anything uses it (see removeCategory).
export function CategorySheet({ open, onOpenChange, category, categories }: CategorySheetProps) {
  const [step, setStep] = useState<'edit' | 'remove'>('edit')
  // Each opening starts on the name, even if the last one ended on the confirmation.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setStep('edit')
  }
  // Focus goes to the sheet itself, not the field, so the keyboard does not
  // open by itself; tapping the field opens it.
  const contentRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const close = () => onOpenChange(false)

  const title = !category ? '' : step === 'edit' ? category.name : `Remover “${category.name}”?`

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title} initialFocus={contentRef}>
      <div ref={contentRef} tabIndex={-1} className="outline-none">
        {category &&
          (step === 'edit' ? (
            <EditCategory
              key={category.id}
              category={category}
              categories={categories}
              inputRef={inputRef}
              onRemove={() => setStep('remove')}
              onDone={close}
            />
          ) : (
            <RemoveCategory category={category} onCancel={() => setStep('edit')} onDone={close} />
          ))}
      </div>
    </BottomSheet>
  )
}

function EditCategory({
  category,
  categories,
  inputRef,
  onRemove,
  onDone,
}: {
  category: Category
  categories: Category[]
  inputRef: RefObject<HTMLInputElement | null>
  onRemove: () => void
  onDone: () => void
}) {
  const rename = useRenameCategory()

  return (
    <div className="flex flex-col gap-2">
      <CategoryNameForm
        inputRef={inputRef}
        initialName={category.name}
        submitLabel="Guardar"
        pendingLabel="A guardar…"
        isPending={rename.isPending}
        error={rename.error}
        onEdit={rename.reset}
        onSave={(name) =>
          rename.mutate({ id: category.id, kind: category.kind, name, categories }, { onSuccess: onDone })
        }
      />
      <Button
        variant="ghost"
        size="lg"
        className="w-full text-destructive hover:text-destructive"
        disabled={rename.isPending}
        onClick={onRemove}
      >
        Remover categoria
      </Button>
    </div>
  )
}

function RemoveCategory({
  category,
  onCancel,
  onDone,
}: {
  category: Category
  onCancel: () => void
  onDone: () => void
}) {
  const remove = useRemoveCategory()
  useSheetBusy(remove.isPending)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm text-pretty text-muted-foreground">
        Se tiver movimentos, orçamentos ou subscrições, fica arquivada e continua nos registos antigos. Se não, é
        apagada.
      </p>
      {remove.error && (
        <p role="alert" className="text-center text-sm text-destructive">
          {financeErrorMessage(remove.error)}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Button
          variant="destructive"
          size="lg"
          className="w-full"
          disabled={remove.isPending}
          onClick={() => remove.mutate(category.id, { onSuccess: onDone })}
        >
          {remove.isPending ? 'A remover…' : 'Remover'}
        </Button>
        <Button variant="outline" size="lg" className="w-full" disabled={remove.isPending} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
