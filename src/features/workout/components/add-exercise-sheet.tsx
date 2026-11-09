import { useRef, type RefObject } from 'react'
import { BottomSheet } from '@/components/bottom-sheet'
import { useSheetBusy } from '@/components/sheet-busy'
import { Button } from '@/components/ui/button'
import { ExercisePicker } from '@/features/workout/components/exercise-picker'
import { useAddRoutineExercise } from '@/features/workout/hooks/use-routine-mutations'
import { ROUTINE_FULL_MESSAGE, isRoutineFull } from '@/features/workout/lib/routine-limits'
import type { RoutineExercise } from '@/features/workout/lib/types'

type AddExerciseSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  routineId: string
  // The routine's current exercises: marked "✓ Na rotina", and counted for the limit.
  entries: RoutineExercise[]
}

// Search, create or reactivate exercises and add them to the routine. The
// sheet stays open after each addition, so several can be added in a row.
export function AddExerciseSheet({ open, onOpenChange, routineId, entries }: AddExerciseSheetProps) {
  // Here the keyboard should open: searching is the first thing to do.
  const searchRef = useRef<HTMLInputElement>(null)

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Adicionar exercício" initialFocus={searchRef}>
      <RoutineExercisePicker
        searchRef={searchRef}
        routineId={routineId}
        entries={entries}
        onDone={() => onOpenChange(false)}
      />
    </BottomSheet>
  )
}

function RoutineExercisePicker({
  searchRef,
  routineId,
  entries,
  onDone,
}: {
  searchRef: RefObject<HTMLInputElement | null>
  routineId: string
  entries: RoutineExercise[]
  onDone: () => void
}) {
  const add = useAddRoutineExercise(routineId)
  useSheetBusy(add.isPending)

  return (
    <div className="flex flex-col gap-3">
      <ExercisePicker
        searchRef={searchRef}
        takenIds={new Set(entries.map((entry) => entry.exercise_id))}
        takenLabel="Na rotina"
        limitMessage={isRoutineFull(entries.length) ? ROUTINE_FULL_MESSAGE : null}
        pending={add.isPending ? add.variables.choice : null}
        pendingLabel="A adicionar…"
        error={add.error}
        onEdit={add.reset}
        // The mutation ends after the refetch, so the row already shows "✓ Na rotina".
        onPick={(choice, exercises, clear) => add.mutate({ choice, entries, exercises }, { onSuccess: clear })}
      />
      <Button variant="outline" size="lg" className="w-full" disabled={add.isPending} onClick={onDone}>
        Concluído
      </Button>
    </div>
  )
}
