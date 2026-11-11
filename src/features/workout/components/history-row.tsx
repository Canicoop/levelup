import { Fragment } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { PendingBadge } from '@/features/workout/components/pending-badge'
import { formatRecordSummary, type WorkoutRecord } from '@/features/workout/lib/history'

// One finished workout in the Workout tab's history: the
// routine, then "ontem · 1 h 05 min · 4 exercícios · 15 séries". Opens its detail.
export function HistoryRow({ record, now }: { record: WorkoutRecord; now: Date }) {
  return (
    // The ring is inset: the card clips anything outside it.
    <Link
      to={`/treino/historico/${record.id}`}
      className="flex min-h-14 touch-manipulation items-center gap-3 px-4 py-2 outline-none select-none transition-[opacity,background-color] duration-150 ease-out hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset active:opacity-70 motion-reduce:transition-none"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-base font-medium">{record.routineName}</span>
          {record.pending && <PendingBadge />}
        </span>
        <span className="text-sm text-muted-foreground">
          {/* Each part stays whole, and a line only breaks after a "·", never
              before one. */}
          {formatRecordSummary(record, now)
            .split(' · ')
            .map((part, index, parts) => {
              const last = index === parts.length - 1
              return (
                <Fragment key={index}>
                  <span className="whitespace-nowrap">{last ? part : `${part} ·`}</span>
                  {!last && ' '}
                </Fragment>
              )
            })}
        </span>
      </div>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
    </Link>
  )
}
