import { useRef, type RefObject } from 'react'
import { BottomSheet } from '@/components/bottom-sheet'
import { NameForm } from '@/features/workout/components/name-form'
import { useRenameRoutine } from '@/features/workout/hooks/use-routine-mutations'
import { validateRoutineName } from '@/features/workout/lib/names'
import type { Routine } from '@/features/workout/lib/types'

type RenameRoutineSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  routine: Routine
}

// The "Nova rotina" form, filled with the current name.
export function RenameRoutineSheet({ open, onOpenChange, routine }: RenameRoutineSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Mudar nome" initialFocus={inputRef}>
      <RenameRoutineForm inputRef={inputRef} routine={routine} onDone={() => onOpenChange(false)} />
    </BottomSheet>
  )
}

function RenameRoutineForm({
  inputRef,
  routine,
  onDone,
}: {
  inputRef: RefObject<HTMLInputElement | null>
  routine: Routine
  onDone: () => void
}) {
  const renameRoutine = useRenameRoutine()

  return (
    <NameForm
      inputRef={inputRef}
      validate={validateRoutineName}
      initialName={routine.name}
      submitLabel="Guardar"
      pendingLabel="A guardar…"
      isPending={renameRoutine.isPending}
      error={renameRoutine.error}
      onEdit={renameRoutine.reset}
      onSave={(name) => renameRoutine.mutate({ id: routine.id, name }, { onSuccess: onDone })}
    />
  )
}
