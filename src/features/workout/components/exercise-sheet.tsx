import { useRef, useState, type RefObject } from 'react'
import { BottomSheet } from '@/components/bottom-sheet'
import { OfflineState } from '@/components/offline-state'
import { useSheetBusy } from '@/components/sheet-busy'
import { Button } from '@/components/ui/button'
import { NameForm } from '@/features/workout/components/name-form'
import { useArchiveExercise, useRenameExercise } from '@/features/workout/hooks/use-exercise-mutations'
import { useExerciseRoutines, useExercises } from '@/features/workout/hooks/use-workout-queries'
import { getErrorMessage } from '@/features/workout/lib/errors'
import { validateExerciseName } from '@/features/workout/lib/names'
import type { Exercise, ExerciseRoutine } from '@/features/workout/lib/types'
import { isWaitingForNetwork } from '@/lib/query-state'

type ExerciseSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Kept by the caller while the sheet closes (see TargetsSheet).
  exercise: Exercise | null
}

// One exercise on the Exercises screen: rename it, or archive it after a
// confirmation shown in the same sheet.
export function ExerciseSheet({ open, onOpenChange, exercise }: ExerciseSheetProps) {
  const [step, setStep] = useState<'edit' | 'archive'>('edit')
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

  const title = !exercise ? '' : step === 'edit' ? exercise.name : `Arquivar “${exercise.name}”?`

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title} initialFocus={contentRef}>
      <div ref={contentRef} tabIndex={-1} className="outline-none">
        {exercise &&
          (step === 'edit' ? (
            <EditExercise
              key={exercise.id}
              exercise={exercise}
              inputRef={inputRef}
              onArchive={() => setStep('archive')}
              onDone={close}
            />
          ) : (
            <ArchiveExercise exercise={exercise} onCancel={() => setStep('edit')} onDone={close} />
          ))}
      </div>
    </BottomSheet>
  )
}

function EditExercise({
  exercise,
  inputRef,
  onArchive,
  onDone,
}: {
  exercise: Exercise
  inputRef: RefObject<HTMLInputElement | null>
  onArchive: () => void
  onDone: () => void
}) {
  const rename = useRenameExercise()
  // Already loaded: the Exercises screen shows this list.
  const exercises = useExercises()

  return (
    <div className="flex flex-col gap-4">
      <NameForm
        inputRef={inputRef}
        validate={validateExerciseName}
        initialName={exercise.name}
        submitLabel="Guardar"
        pendingLabel="A guardar…"
        isPending={rename.isPending}
        error={rename.error}
        onEdit={rename.reset}
        onSave={(name) =>
          rename.mutate({ id: exercise.id, name, exercises: exercises.data ?? [] }, { onSuccess: onDone })
        }
      />
      <Button variant="ghost" size="lg" className="w-full" disabled={rename.isPending} onClick={onArchive}>
        Arquivar exercício
      </Button>
    </div>
  )
}

// "Vai sair da rotina Push." / "Vai sair das rotinas Push e Upper." /
// "Podes reativá-lo em Arquivados."
const listFormat = new Intl.ListFormat('pt-PT', { style: 'long', type: 'conjunction' })

function archiveMessage(routines: ExerciseRoutine[]) {
  if (routines.length === 0) return 'Podes reativá-lo em Arquivados.'
  const names = listFormat.format(routines.map((routine) => routine.name))
  return routines.length === 1 ? `Vai sair da rotina ${names}.` : `Vai sair das rotinas ${names}.`
}

function ArchiveExercise({
  exercise,
  onCancel,
  onDone,
}: {
  exercise: Exercise
  onCancel: () => void
  onDone: () => void
}) {
  const routines = useExerciseRoutines(exercise.id)
  const archive = useArchiveExercise()
  useSheetBusy(archive.isPending)

  return (
    <div className="flex flex-col gap-4">
      {isWaitingForNetwork(routines) ? (
        <div className="text-center">
          <OfflineState />
        </div>
      ) : (
        <p className="text-center text-sm text-pretty text-muted-foreground">
          {routines.data
            ? archiveMessage(routines.data)
            : routines.isError
              ? getErrorMessage(routines.error)
              : 'A verificar rotinas…'}
        </p>
      )}
      {archive.error && (
        <p role="alert" className="text-center text-sm text-destructive">
          {getErrorMessage(archive.error)}
        </p>
      )}
      <div className="flex flex-col gap-2">
        {/* Archiving waits for the list, so the user knows what it changes. */}
        {!routines.data && routines.isError ? (
          <Button size="lg" className="w-full" onClick={() => void routines.refetch()}>
            Tentar outra vez
          </Button>
        ) : (
          <Button
            size="lg"
            className="w-full"
            disabled={!routines.data || archive.isPending}
            onClick={() => archive.mutate(exercise.id, { onSuccess: onDone })}
          >
            {archive.isPending ? 'A arquivar…' : 'Arquivar'}
          </Button>
        )}
        <Button variant="outline" size="lg" className="w-full" disabled={archive.isPending} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
