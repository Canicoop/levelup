import { useState } from 'react'
import { BottomSheet } from '@/components/bottom-sheet'
import { Button } from '@/components/ui/button'
import { setActiveWorkout } from '@/features/workout/active-workout-store'
import { DiscardWorkoutConfirm } from '@/features/workout/components/discard-workout-sheet'

type WorkoutMenuSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  loggedSets: number
}

// The "⋯" of the workout screen. Discarding asks in the same sheet, and only
// with logged sets to lose. Without a workout the screen goes back by itself.
export function WorkoutMenuSheet({ open, onOpenChange, loggedSets }: WorkoutMenuSheetProps) {
  const [confirming, setConfirming] = useState(false)
  // Each opening starts on the menu.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setConfirming(false)
  }

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={confirming ? 'Descartar treino?' : 'Treino em curso'}>
      {confirming ? (
        <DiscardWorkoutConfirm loggedSets={loggedSets} onCancel={() => setConfirming(false)} />
      ) : (
        <Button
          variant="ghost"
          size="lg"
          className="w-full text-destructive hover:text-destructive"
          onClick={() => (loggedSets === 0 ? setActiveWorkout(null) : setConfirming(true))}
        >
          Descartar treino
        </Button>
      )}
    </BottomSheet>
  )
}
