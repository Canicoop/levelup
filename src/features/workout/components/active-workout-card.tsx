import { Suspense, lazy, useState } from 'react'
import { cn } from 'cn'
import { Link } from 'react-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { setActiveWorkout } from '@/features/workout/active-workout-store'
import { countLoggedSets, type ActiveWorkout } from '@/features/workout/lib/active-workout'
import { formatLoggedSets } from '@/features/workout/lib/labels'
import { loadWorkoutPages } from '@/features/workout/load-pages'

// Home loads with the main chunk and this card must not show late, but the
// sheet would bring the drawer into it. So only the sheet is lazy, from the
// Workout chunk, which is usually preloaded by the time it is needed.
const DiscardWorkoutSheet = lazy(() =>
  loadWorkoutPages().then(({ DiscardWorkoutSheet }) => ({ default: DiscardWorkoutSheet })),
)

// A workout in progress, on the Workout tab and on Home.
export function ActiveWorkoutCard({ workout }: { workout: ActiveWorkout }) {
  const [confirming, setConfirming] = useState(false)
  // Stays mounted once opened, so the sheet can animate out.
  const [sheetLoaded, setSheetLoaded] = useState(false)
  const loggedSets = countLoggedSets(workout)

  function discard() {
    if (loggedSets === 0) {
      setActiveWorkout(null)
      return
    }
    setSheetLoaded(true)
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
      {sheetLoaded && (
        <Suspense fallback={null}>
          <DiscardWorkoutSheet open={confirming} onOpenChange={setConfirming} loggedSets={loggedSets} />
        </Suspense>
      )}
    </Card>
  )
}
