import { useId, useState, type FormEvent, type RefObject } from 'react'
import { useSheetBusy } from '@/components/sheet-busy'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/features/workout/lib/errors'
import { cleanName, validateRoutineName } from '@/features/workout/lib/names'

type RoutineNameFormProps = {
  inputRef: RefObject<HTMLInputElement | null>
  initialName?: string
  submitLabel: string
  pendingLabel: string
  // The mutation's state; the mutation itself lives in the caller, which
  // unmounts with the sheet, so each opening starts clean.
  isPending: boolean
  error: Error | null
  onSave: (name: string) => void
  // Called on every edit, to clear the previous save error.
  onEdit: () => void
}

// The routine name field, shared by "Nova rotina" and "Mudar nome".
export function RoutineNameForm({
  inputRef,
  initialName = '',
  submitLabel,
  pendingLabel,
  isPending,
  error: saveError,
  onSave,
  onEdit,
}: RoutineNameFormProps) {
  const [name, setName] = useState(initialName)
  const [invalid, setInvalid] = useState<string | null>(null)
  const inputId = useId()
  const errorId = useId()
  useSheetBusy(isPending)

  const error = invalid ?? (saveError ? getErrorMessage(saveError) : null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPending) return
    const problem = validateRoutineName(cleanName(name))
    if (problem) {
      setInvalid(problem)
      inputRef.current?.focus()
      return
    }
    onSave(name)
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
