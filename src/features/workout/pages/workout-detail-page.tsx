import { useParams } from 'react-router'
import { ErrorState } from '@/components/error-state'
import { OfflineState } from '@/components/offline-state'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PendingBadge } from '@/features/workout/components/pending-badge'
import { useWorkoutDetail } from '@/features/workout/hooks/use-workout-history'
import { NotFoundError } from '@/features/workout/lib/errors'
import { formatSetCount } from '@/features/workout/lib/finish-labels'
import {
  countRecordSets,
  formatRecordDuration,
  formatWorkoutDateTime,
  formatWorkoutSets,
} from '@/features/workout/lib/history'
import { formatExerciseCount } from '@/features/workout/lib/labels'
import { useNow } from '@/hooks/use-now'
import { isWaitingForNetwork } from '@/lib/query-state'

const BACK = { to: '/treino', label: 'Voltar ao Treino' }

// A finished workout, to look at only (rules AV and AW): no editing or deleting,
// since the database allows neither.
export function WorkoutDetailPage() {
  const { id = '' } = useParams()
  const now = useNow()
  const { query, record } = useWorkoutDetail(id)

  if (!record) {
    if (query.error instanceof NotFoundError) {
      return (
        <div className="flex flex-col gap-8">
          <PageHeader title="Treino não encontrado" back={BACK} />
          <p className="text-sm text-pretty text-muted-foreground">
            Este treino não existe, ou o endereço está incompleto.
          </p>
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Treino" back={BACK} />
        {isWaitingForNetwork(query) ? (
          <OfflineState />
        ) : query.isError ? (
          <ErrorState onRetry={() => void query.refetch()} />
        ) : (
          <DetailSkeleton />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={record.routineName}
        documentTitle="Treino"
        back={BACK}
        subtitle={<time dateTime={record.startedAt}>{formatWorkoutDateTime(record.startedAt, now)}</time>}
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {formatRecordDuration(record)} · {formatExerciseCount(record.exercises.length)} ·{' '}
            {formatSetCount(countRecordSets(record))}
          </p>
          {record.pending && <PendingBadge />}
        </div>

        <Card className="gap-0 py-0">
          <ul className="divide-y divide-border">
            {record.exercises.map((exercise) => (
              <li key={exercise.exerciseId} className="flex flex-col gap-0.5 px-4 py-3">
                <span className="text-base font-medium wrap-break-word">{exercise.name}</span>
                <span className="text-sm text-muted-foreground tabular-nums">{formatWorkoutSets(exercise.sets)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">A carregar…</span>
      <Card aria-hidden className="gap-0 py-0">
        <div className="divide-y divide-border">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex flex-col gap-2 px-4 py-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3.5 w-48" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
