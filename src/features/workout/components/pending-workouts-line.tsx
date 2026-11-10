import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CircleAlert, CloudUpload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { RejectedWorkoutActions } from '@/features/workout/components/rejected-workout-actions'
import { loadSender } from '@/features/workout/load-sender'
import { usePendingWorkouts, useSendingId } from '@/features/workout/hooks/use-finished-workouts'
import { formatRejectedCount, formatWaitingCount, formatWorkoutLabel } from '@/features/workout/lib/finish-labels'
import { sendablePendingWorkouts } from '@/features/workout/lib/pending-workouts'

// The finished workouts still on the device, on Home and the Workout tab (rule
// AR). Quiet, and only when there are some: they are sent by themselves.
export function PendingWorkoutsLine() {
  const queue = usePendingWorkouts()
  const waiting = sendablePendingWorkouts(queue)
  const rejected = queue.filter((workout) => workout.rejected)
  if (waiting.length === 0 && rejected.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {waiting.length > 0 && <WaitingLine count={waiting.length} />}
      {rejected.length > 0 && (
        <Card size="sm" role="status">
          <div className="flex flex-col gap-3 px-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <CircleAlert aria-hidden className="size-4 shrink-0 text-destructive" strokeWidth={1.75} />
              {formatRejectedCount(rejected.length)}
            </p>
            {rejected.length === 1 ? (
              <RejectedWorkoutActions workout={rejected[0]} />
            ) : (
              <ul className="flex flex-col gap-3">
                {rejected.map((workout) => (
                  <li key={workout.payload.id} className="flex flex-col gap-1">
                    <p className="text-sm text-muted-foreground wrap-break-word">{formatWorkoutLabel(workout)}</p>
                    <RejectedWorkoutActions workout={workout} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

function WaitingLine({ count }: { count: number }) {
  const queryClient = useQueryClient()
  const sendingId = useSendingId()
  const [trying, setTrying] = useState(false)
  const busy = trying || sendingId !== null

  async function tryNow() {
    setTrying(true)
    try {
      await (await loadSender()).sendPendingWorkouts(queryClient)
    } catch {
      // The sender could not load (offline before it was cached): it stays.
    } finally {
      setTrying(false)
    }
  }

  return (
    <Card size="sm" role="status">
      <div className="flex items-center justify-between gap-3 px-3">
        <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <CloudUpload aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
          {formatWaitingCount(count)}
        </p>
        <Button variant="outline" className="h-11 shrink-0" disabled={busy} onClick={() => void tryNow()}>
          {busy ? 'A enviar…' : 'Tentar agora'}
        </Button>
      </div>
    </Card>
  )
}
