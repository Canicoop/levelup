import { useRef, type RefObject } from 'react'
import { useNavigate } from 'react-router'
import { BottomSheet } from '@/components/bottom-sheet'
import { RoutineNameForm } from '@/features/workout/components/routine-name-form'
import { useCreateRoutine } from '@/features/workout/hooks/use-routine-mutations'
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

  return (
    <RoutineNameForm
      inputRef={inputRef}
      submitLabel="Criar"
      pendingLabel="A criar…"
      isPending={createRoutine.isPending}
      error={createRoutine.error}
      onEdit={createRoutine.reset}
      onSave={(name) =>
        createRoutine.mutate(
          { name, routines },
          { onSuccess: (routine) => navigate(`/treino/rotinas/${routine.id}`) },
        )
      }
    />
  )
}
