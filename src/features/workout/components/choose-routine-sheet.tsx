import { BottomSheet } from '@/components/bottom-sheet'
import { useSheetBusy } from '@/components/sheet-busy'
import { useStartWorkout } from '@/features/workout/hooks/use-start-workout'
import { getErrorMessage } from '@/features/workout/lib/errors'
import { formatExerciseCount } from '@/features/workout/lib/labels'
import type { RoutineSummary } from '@/features/workout/lib/types'

type ChooseRoutineSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // The active routines, in list order.
  routines: RoutineSummary[]
}

// "Escolher outra rotina": tapping one starts the workout with it.
export function ChooseRoutineSheet({ open, onOpenChange, routines }: ChooseRoutineSheetProps) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Escolher rotina">
      <RoutinePicker routines={routines} />
    </BottomSheet>
  )
}

function RoutinePicker({ routines }: { routines: RoutineSummary[] }) {
  const start = useStartWorkout()
  useSheetBusy(start.isPending)

  return (
    <div className="flex flex-col gap-3">
      {start.error && (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(start.error)}
        </p>
      )}
      <ul className="-mx-4 max-h-[60dvh] divide-y divide-border overflow-y-auto overscroll-contain border-y border-border">
        {routines.map((routine) => {
          const empty = routine.exercise_count === 0
          const starting = start.isPending && start.variables === routine.id
          return (
            <li key={routine.id}>
              <button
                type="button"
                disabled={empty || start.isPending}
                onClick={() => start.mutate(routine.id)}
                className="flex min-h-14 w-full touch-manipulation flex-col justify-center px-4 py-2 text-left outline-none select-none transition-[opacity,background-color] duration-150 ease-out hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset active:opacity-70 disabled:pointer-events-none motion-reduce:transition-none"
              >
                <span className={`text-base font-medium wrap-break-word ${empty ? 'text-muted-foreground' : ''}`}>
                  {routine.name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {starting
                    ? 'A começar…'
                    : empty
                      ? 'Esta rotina não tem exercícios.'
                      : formatExerciseCount(routine.exercise_count)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
