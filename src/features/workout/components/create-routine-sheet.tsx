import { useId, useRef, useState, type FormEvent, type RefObject } from 'react'
import { useNavigate } from 'react-router'
import { BottomSheet } from '@/components/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateRoutine } from '@/features/workout/hooks/use-routine-mutations'
import { getErrorMessage } from '@/features/workout/lib/errors'
import { cleanName, validateRoutineName } from '@/features/workout/lib/names'
import type { Routine } from '@/features/workout/lib/types'

type CreateRoutineSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // The active routines: the new one goes to the end of the list.
  routines: Routine[]
}

// Asks for a name, creates the routine and opens it in the editor.
export function CreateRoutineSheet({ open, onOpenChange, routines }: CreateRoutineSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Nova rotina" initialFocus={inputRef}>
      {/* The form unmounts when the sheet closes, so it opens empty each time. */}
      <CreateRoutineForm inputRef={inputRef} routines={routines} />
    </BottomSheet>
  )
}

function CreateRoutineForm({
  inputRef,
  routines,
}: {
  inputRef: RefObject<HTMLInputElement | null>
  routines: Routine[]
}) {
  const navigate = useNavigate()
  const createRoutine = useCreateRoutine()
  const [name, setName] = useState('')
  const [invalid, setInvalid] = useState<string | null>(null)
  const inputId = useId()
  const errorId = useId()

  const error = invalid ?? (createRoutine.error ? getErrorMessage(createRoutine.error) : null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (createRoutine.isPending) return
    const problem = validateRoutineName(cleanName(name))
    if (problem) {
      setInvalid(problem)
      inputRef.current?.focus()
      return
    }
    createRoutine.mutate(
      { name, routines },
      { onSuccess: (routine) => navigate(`/treino/rotinas/${routine.id}`) },
    )
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
            createRoutine.reset()
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
      <Button type="submit" size="lg" className="w-full" disabled={createRoutine.isPending}>
        {createRoutine.isPending ? 'A criar…' : 'Criar'}
      </Button>
    </form>
  )
}
