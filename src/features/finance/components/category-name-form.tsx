import { useId, useState, type FormEvent, type RefObject } from 'react'
import { useSheetBusy } from '@/components/sheet-busy'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { financeErrorMessage } from '@/features/finance/lib/errors'
import { validateCategoryName } from '@/features/finance/lib/validation'

type CategoryNameFormProps = {
  inputRef: RefObject<HTMLInputElement | null>
  initialName?: string
  submitLabel: string
  pendingLabel: string
  // The mutation's state; the mutation itself lives in the caller, which
  // unmounts with the sheet, so each opening starts clean.
  isPending: boolean
  error: Error | null
  // The cleaned name (validateCategoryName).
  onSave: (name: string) => void
  // Called on every edit, to clear the previous save error.
  onEdit: () => void
}

// A category's name, when creating or renaming one: up to 40 characters, with
// the Finance module's messages. The Workout module's NameForm is not reused,
// since it shows that module's messages.
export function CategoryNameForm({
  inputRef,
  initialName = '',
  submitLabel,
  pendingLabel,
  isPending,
  error: saveError,
  onSave,
  onEdit,
}: CategoryNameFormProps) {
  const [name, setName] = useState(initialName)
  const [invalid, setInvalid] = useState<string | null>(null)
  const inputId = useId()
  const errorId = useId()
  useSheetBusy(isPending)

  const error = invalid ?? (saveError ? financeErrorMessage(saveError) : null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPending) return
    const result = validateCategoryName(name)
    if (!result.ok) {
      setInvalid(result.error)
      inputRef.current?.focus()
      return
    }
    onSave(result.value)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-sm font-medium">
          Nome
        </label>
        <Input
          ref={inputRef}
          id={inputId}
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            setInvalid(null)
            onEdit()
          }}
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="done"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        {error && (
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </form>
  )
}
