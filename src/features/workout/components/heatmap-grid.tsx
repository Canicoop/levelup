import { cn } from 'cn'
import { FUTURE_CLASSES, LEVEL_CLASSES, TODAY_CLASSES } from '@/features/workout/components/heatmap-styles'
import {
  formatHeatmapDayLabel,
  heatmapLevel,
  type DayTotal,
  type HeatmapDay,
} from '@/features/workout/lib/history'

type HeatmapGridProps = {
  weeks: HeatmapDay[][]
  totals: Map<string, DayTotal>
} & (
  | {
      // The Workout tab: squares up to 44px, today ringed, the rest of the week
      // dashed, each day labelled, and the days with a workout open it.
      variant: 'squares'
      labelledBy: string
      onOpen: (day: string) => void
    }
  | {
      // Home: low bars across the whole card, only to look at, hidden from
      // screen readers (the card says it in text). No today ring, as in the
      // "Graphite" mockup.
      variant: 'bars'
    }
)

// The 12 weeks' grid, one column per week (oldest first) and one row per day,
// Monday to Sunday. Only the grid: no data, no sheet, so Home can use it from
// the main chunk without bringing the drawer.
export function HeatmapGrid(props: HeatmapGridProps) {
  const { weeks, totals } = props
  const days = weeks.flat()

  if (props.variant === 'bars') {
    return (
      <div aria-hidden className="grid grid-flow-col grid-cols-12 grid-rows-7 gap-[3px]">
        {days.map((day) => (
          <span
            key={day.day}
            className={cn(
              'h-2.5 rounded-[2px] sm:h-3',
              day.isFuture ? 'bg-heatmap-0 opacity-40' : LEVEL_CLASSES[heatmapLevel(totals.get(day.day)?.sets ?? 0)],
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      role="group"
      aria-labelledby={props.labelledBy}
      className="grid grid-flow-col grid-cols-[repeat(12,minmax(0,2.75rem))] grid-rows-7 gap-1 sm:gap-1.5"
    >
      {days.map((day) => (
        <SquareCell key={day.day} day={day} sets={totals.get(day.day)?.sets ?? 0} onOpen={props.onOpen} />
      ))}
    </div>
  )
}

// Shared by every day: the same square, whatever it holds.
const CELL = 'aspect-square w-full rounded-[3px] sm:rounded-[5px]'

function SquareCell({ day, sets, onOpen }: { day: HeatmapDay; sets: number; onOpen: (day: string) => void }) {
  // The rest of this week: empty and set apart, and nothing to read out.
  if (day.isFuture) return <span aria-hidden className={cn(CELL, FUTURE_CLASSES)} />

  const label = formatHeatmapDayLabel(day.day, sets)
  const className = cn(CELL, LEVEL_CLASSES[heatmapLevel(sets)], day.isToday && TODAY_CLASSES)

  // A day without a workout does not react.
  if (sets === 0) {
    return <span role="img" aria-label={label} aria-current={day.isToday ? 'date' : undefined} className={className} />
  }
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={day.isToday ? 'date' : undefined}
      onClick={() => onOpen(day.day)}
      className={cn(
        className,
        'touch-manipulation outline-none transition-transform duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100 motion-reduce:active:opacity-70',
      )}
    />
  )
}
