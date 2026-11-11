import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { PendingBadge } from '@/features/workout/components/pending-badge'
import { formatSetCount } from '@/features/workout/lib/finish-labels'
import { countRecordSets, formatDayLabel, type WorkoutRecord } from '@/features/workout/lib/history'

type HeatmapDayDetailsProps = {
  // The day picked on the heatmap, or null.
  day: string | null
  workouts: WorkoutRecord[]
}

// Below Home's heatmap (rule AV): the day picked and its workouts, each opening
// its detail, or "Sem treino". Its space is always kept, as tall as a day with
// one workout, so picking, changing or clearing a day does not move the card;
// only a day with two or more workouts grows it. Read out when it changes.
export function HeatmapDayDetails({ day, workouts }: HeatmapDayDetailsProps) {
  return (
    <div aria-live="polite" className="flex min-h-17 flex-col justify-center">
      {day === null ? (
        <p className="text-sm text-muted-foreground">Toca num dia para ver o treino.</p>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{formatDayLabel(day)}</p>
          {workouts.length === 0 ? (
            <p className="flex min-h-11 items-center text-base font-medium">Sem treino</p>
          ) : (
            <ul className="flex flex-col">
              {workouts.map((record) => (
                <li key={record.id}>
                  <DayWorkoutLink record={record} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// The routine, "18 séries" and ›. -mx-2 px-2 extends the hover fill without
// moving the text off the card's content edge.
function DayWorkoutLink({ record }: { record: WorkoutRecord }) {
  return (
    <Link
      to={`/treino/historico/${record.id}`}
      className="-mx-2 flex min-h-11 touch-manipulation items-center gap-3 rounded-lg px-2 outline-none select-none transition-[opacity,background-color] duration-150 ease-out hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring active:opacity-70 motion-reduce:transition-none"
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-base font-medium">{record.routineName}</span>
        {record.pending && <PendingBadge />}
      </span>
      {/* So the link reads "Pull, 12 séries", not "Pull12 séries". */}
      <span className="sr-only">, </span>
      <span className="shrink-0 text-sm text-muted-foreground">{formatSetCount(countRecordSets(record))}</span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
    </Link>
  )
}
