import { BottomSheet } from '@/components/bottom-sheet'
import { Button } from '@/components/ui/button'
import { setActiveWorkout } from '@/features/workout/active-workout-store'
import type { ActiveWorkout } from '@/features/workout/lib/active-workout'
import { formatFinishCounts, formatFinishNote } from '@/features/workout/lib/finish-labels'
import { finishCounts, finishTime } from '@/features/workout/lib/finishing'

type FinishWorkoutSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workout: ActiveWorkout
  // When "Terminar" was tapped (ISO). The note and the finish time both come
  // from it, so the time shown is the time saved.
  now: string
  onFinish: (now: string) => void
}

// "Terminar" always asks first (rule AP). With nothing logged there is nothing
// to save, so it offers to discard instead.
export function FinishWorkoutSheet({ open, onOpenChange, workout, now, onFinish }: FinishWorkoutSheetProps) {
  const counts = finishCounts(workout)
  const empty = counts.logged === 0
  const { finishedAt, reason } = finishTime(workout, now)
  const note = formatFinishNote(reason, finishedAt)

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={empty ? 'Descartar treino?' : 'Terminar treino?'}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 text-center text-sm text-pretty text-muted-foreground">
          <p>{empty ? 'Não registaste nenhuma série.' : formatFinishCounts(counts)}</p>
          {!empty && note && <p>{note}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            className="w-full"
            onClick={() => (empty ? setActiveWorkout(null) : onFinish(now))}
          >
            {empty ? 'Descartar' : 'Terminar'}
          </Button>
          <Button variant="outline" size="lg" className="w-full" onClick={() => onOpenChange(false)}>
            Continuar treino
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
