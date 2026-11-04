import { BottomSheet } from '@/components/bottom-sheet'
import { Button } from '@/components/ui/button'
import { setActiveWorkout } from '@/features/workout/active-workout-store'
import { formatDiscardWarning } from '@/features/workout/lib/labels'

type DiscardWorkoutConfirmProps = {
  loggedSets: number
  onCancel: () => void
}

// Asked only when there are logged sets to lose. Discarding is local, so there
// is nothing to wait for.
export function DiscardWorkoutConfirm({ loggedSets, onCancel }: DiscardWorkoutConfirmProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm text-pretty text-muted-foreground">{formatDiscardWarning(loggedSets)}</p>
      <div className="flex flex-col gap-2">
        <Button size="lg" className="w-full" onClick={() => setActiveWorkout(null)}>
          Descartar
        </Button>
        <Button variant="outline" size="lg" className="w-full" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

type DiscardWorkoutSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  loggedSets: number
}

export function DiscardWorkoutSheet({ open, onOpenChange, loggedSets }: DiscardWorkoutSheetProps) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Descartar treino?">
      <DiscardWorkoutConfirm loggedSets={loggedSets} onCancel={() => onOpenChange(false)} />
    </BottomSheet>
  )
}
