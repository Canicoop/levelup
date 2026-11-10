import { BottomSheet } from '@/components/bottom-sheet'
import { Button } from '@/components/ui/button'
import { formatDiscardWarning } from '@/features/workout/lib/labels'

type DiscardPendingSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // The sets of the workout to discard, for the warning.
  sets: number
  onDiscard: () => void
}

// "Descartar" on a workout the database refused. Loaded lazily from the Workout
// chunk where Home shows it, like DiscardWorkoutSheet.
export function DiscardPendingSheet({ open, onOpenChange, sets, onDiscard }: DiscardPendingSheetProps) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Descartar este treino?">
      <div className="flex flex-col gap-4">
        <p className="text-center text-sm text-pretty text-muted-foreground">{formatDiscardWarning(sets)}</p>
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              onDiscard()
              onOpenChange(false)
            }}
          >
            Descartar
          </Button>
          <Button variant="outline" size="lg" className="w-full" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
