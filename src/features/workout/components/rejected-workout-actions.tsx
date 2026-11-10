import { Suspense, lazy, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { countWorkoutSets } from '@/features/workout/lib/finish-labels'
import type { PendingWorkout } from '@/features/workout/lib/pending-workouts'
import { loadWorkoutPages } from '@/features/workout/load-pages'
import { loadSender } from '@/features/workout/load-sender'

// On Home this is in the main chunk, so the sheet (with the drawer) and the
// sender come on demand, from the Workout chunk and their own.
const DiscardPendingSheet = lazy(() =>
  loadWorkoutPages().then(({ DiscardPendingSheet }) => ({ default: DiscardPendingSheet })),
)

// "Tentar outra vez" and "Descartar" (with a confirmation) for a workout the
// database refused, on the queue line and the summary screen.
export function RejectedWorkoutActions({ workout }: { workout: PendingWorkout }) {
  const queryClient = useQueryClient()
  const [retrying, setRetrying] = useState(false)
  const [confirming, setConfirming] = useState(false)
  // Stays mounted once opened, so the sheet can animate out.
  const [sheetLoaded, setSheetLoaded] = useState(false)
  const id = workout.payload.id

  async function retry() {
    setRetrying(true)
    try {
      await (await loadSender()).retryRejectedWorkout(queryClient, id)
    } catch {
      // The sender could not load (offline before it was cached): nothing changed.
    } finally {
      setRetrying(false)
    }
  }

  async function discard() {
    try {
      const sender = await loadSender()
      sender.discardPendingWorkout(queryClient, id)
    } catch {
      // As above: the workout stays.
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" className="h-11" disabled={retrying} onClick={() => void retry()}>
        {retrying ? 'A enviar…' : 'Tentar outra vez'}
      </Button>
      <Button
        variant="ghost"
        className="h-11"
        disabled={retrying}
        onClick={() => {
          setSheetLoaded(true)
          setConfirming(true)
        }}
      >
        Descartar
      </Button>
      {sheetLoaded && (
        <Suspense fallback={null}>
          <DiscardPendingSheet
            open={confirming}
            onOpenChange={setConfirming}
            sets={countWorkoutSets(workout)}
            onDiscard={() => void discard()}
          />
        </Suspense>
      )}
    </div>
  )
}
