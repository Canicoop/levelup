import { useRef, type RefObject } from 'react'
import { BottomSheet } from '@/components/bottom-sheet'
import { NameForm } from '@/features/workout/components/name-form'
import { useCreateExercise } from '@/features/workout/hooks/use-exercise-mutations'
import { validateExerciseName } from '@/features/workout/lib/names'
import type { Exercise } from '@/features/workout/lib/types'

type CreateExerciseSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Every exercise, archived included: an archived one with the same name is
  // reactivated instead (see createExercise).
  exercises: Exercise[]
}

// Creates an exercise outside any routine. The field takes the focus: creating
// was asked for.
export function CreateExerciseSheet({ open, onOpenChange, exercises }: CreateExerciseSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Novo exercício" initialFocus={inputRef}>
      <CreateExerciseForm inputRef={inputRef} exercises={exercises} onDone={() => onOpenChange(false)} />
    </BottomSheet>
  )
}

function CreateExerciseForm({
  inputRef,
  exercises,
  onDone,
}: {
  inputRef: RefObject<HTMLInputElement | null>
  exercises: Exercise[]
  onDone: () => void
}) {
  const createExercise = useCreateExercise()

  return (
    <NameForm
      inputRef={inputRef}
      validate={validateExerciseName}
      submitLabel="Criar"
      pendingLabel="A criar…"
      isPending={createExercise.isPending}
      error={createExercise.error}
      onEdit={createExercise.reset}
      onSave={(name) => createExercise.mutate({ name, exercises }, { onSuccess: onDone })}
    />
  )
}
