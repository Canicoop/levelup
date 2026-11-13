import { useState } from 'react'
import { cn } from 'cn'
import { Link } from 'react-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { setActiveWorkout } from '@/features/workout/active-workout-store'
import { DiscardWorkoutSheet } from '@/features/workout/components/discard-workout-sheet'
import { countLoggedSets, type ActiveWorkout } from '@/features/workout/lib/active-workout'
import { formatLoggedSets } from '@/features/workout/lib/labels'

// A workout in progress, at the top of the Workout tab. Only there (Home has
// had no card for it since step 4.6.5), so it lives in the Workout chunk with
// its confirmation sheet, and the drawer stays out of the main chunk.
export function ActiveWorkoutCard({ workout }: { workout: ActiveWorkout }) {
  const [confirming, setConfirming] = useState(false)
  const loggedSets = countLoggedSets(workout)

  function discard() {
    if (loggedSets === 0) {
      setActiveWorkout(null)
      return
    }
    setConfirming(true)
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 px-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-muted-foreground">Treino em curso</p>
          <p className="text-lg font-semibold wrap-break-word">{workout.routineName}</p>
          <p className="text-sm text-muted-foreground">{formatLoggedSets(loggedSets)}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/treino/em-curso" className={cn(buttonVariants({ size: 'lg' }), 'flex-1')}>
            Continuar
          </Link>
          <Button variant="outline" size="lg" onClick={discard}>
            Descartar
          </Button>
        </div>
      </div>
      <DiscardWorkoutSheet open={confirming} onOpenChange={setConfirming} loggedSets={loggedSets} />
    </Card>
  )
}
