import { Check, CircleAlert, CloudUpload, LoaderCircle, type LucideIcon } from 'lucide-react'
import { cn } from 'cn'
import { Navigate } from 'react-router'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getAccountId } from '@/features/auth/account'
import { RejectedWorkoutActions } from '@/features/workout/components/rejected-workout-actions'
import { useLastFinished, usePendingWorkouts, useSendingId } from '@/features/workout/hooks/use-finished-workouts'
import { clearLastFinished } from '@/features/workout/last-finished-store'
import {
  SEND_STATE_LABELS,
  formatExerciseSets,
  formatSetCount,
  sendState,
  summarizeWorkout,
  type SendState,
} from '@/features/workout/lib/finish-labels'
import { formatExerciseCount } from '@/features/workout/lib/labels'

const STATE_ICONS: Record<SendState, { icon: LucideIcon; className: string }> = {
  sending: { icon: LoaderCircle, className: 'animate-spin text-muted-foreground motion-reduce:animate-none' },
  saved: { icon: Check, className: 'text-success' },
  waiting: { icon: CloudUpload, className: 'text-muted-foreground' },
  rejected: { icon: CircleAlert, className: 'text-destructive' },
}

// "Treino terminado", full screen like the workout (rule AQ). It reads the last
// finished workout kept on the device, so it survives the workout leaving the
// queue and iOS closing the app; opened without one (by its address, or after
// "Concluído"), it goes to the Workout tab.
export function FinishedWorkoutPage() {
  const workout = useLastFinished()
  const queue = usePendingWorkouts()
  const sendingId = useSendingId()

  if (!workout) return <Navigate to="/treino" replace />

  const summary = summarizeWorkout(workout)
  const state = sendState(workout.payload.id, queue, sendingId)
  const queued = queue.find((current) => current.payload.id === workout.payload.id)
  const { icon: StateIcon, className: iconClassName } = STATE_ICONS[state]

  function done() {
    const accountId = getAccountId()
    // Clearing it sends the screen to the Workout tab (the Navigate above).
    if (accountId && workout) clearLastFinished(accountId, workout.payload.id)
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]">
      <PageHeader title="Treino terminado" />

      <Card>
        <div className="flex flex-col gap-3 px-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-lg font-semibold wrap-break-word">{summary.routineName}</p>
            <p className="text-sm text-muted-foreground">
              {summary.duration} · {formatExerciseCount(summary.exerciseCount)} · {formatSetCount(summary.setCount)}
            </p>
          </div>
          <p role="status" className="flex items-center gap-2 text-sm font-medium">
            <StateIcon aria-hidden className={cn('size-4 shrink-0', iconClassName)} strokeWidth={1.75} />
            {SEND_STATE_LABELS[state]}
          </p>
          {state === 'rejected' && queued && <RejectedWorkoutActions workout={queued} />}
        </div>
      </Card>

      <Card className="gap-0 py-0">
        <ul className="divide-y divide-border">
          {summary.exercises.map((exercise) => (
            <li key={exercise.id} className="px-4 py-3 text-sm wrap-break-word">
              {formatExerciseSets(exercise.name, exercise.sets)}
            </li>
          ))}
        </ul>
      </Card>

      <Button size="lg" className="w-full" onClick={done}>
        Concluído
      </Button>
    </div>
  )
}
