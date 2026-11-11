import { useRef, type KeyboardEvent, type MouseEvent } from 'react'
import { cn } from 'cn'
import { Skeleton } from '@/components/ui/skeleton'
import { LEVEL_CLASSES, SELECTED_CLASSES } from '@/features/workout/components/heatmap-styles'
import {
  formatHeatmapDayLabel,
  heatmapLevel,
  stepWorkoutDay,
  type DayTotal,
  type HeatmapDay,
} from '@/features/workout/lib/history'

type HeatmapGridProps = {
  weeks: HeatmapDay[][]
  totals: Map<string, DayTotal>
  // The day picked, or null. Tapping it again clears it.
  selected: string | null
  onSelect: (day: string | null) => void
}

// Home's 12 weeks (rule AV): one column per week, oldest first, and one row per
// day from Monday to Sunday. Tapping a day selects it, and the card shows that
// day's workouts below; it never opens anything on its own, because the cells
// are far below a finger's size and a tap on the wrong day must lead nowhere.
//
// Days with a workout are buttons, with one tab stop for the whole grid (a
// roving tabindex): the selected day, or else the most recent one. The arrows
// move between them (stepWorkoutDay), Enter or Space selects, Escape clears.
// Days without a workout are selected by touch or mouse only; they hold nothing
// to read out. The rest of this week is faint and does not react.
export function HeatmapGrid({ weeks, totals, selected, onSelect }: HeatmapGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const days = weeks.flat()
  const setsOf = (day: string) => totals.get(day)?.sets ?? 0
  const workoutDays = days.filter((day) => !day.isFuture && setsOf(day.day) > 0).map((day) => day.day)
  const tabStop = selected && workoutDays.includes(selected) ? selected : workoutDays.at(-1)

  // One handler for every cell, buttons or not: a click (or Enter and Space on a
  // button) toggles the day it lands on.
  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const day = (event.target as HTMLElement).closest<HTMLElement>('[data-day]')?.dataset.day
    if (day) onSelect(day === selected ? null : day)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && selected) {
      event.preventDefault()
      onSelect(null)
      return
    }
    const current = (event.target as HTMLElement).dataset.day ?? null
    const next = stepWorkoutDay(workoutDays, current, event.key)
    if (!next) return
    event.preventDefault()
    gridRef.current?.querySelector<HTMLElement>(`[data-day="${next}"]`)?.focus()
  }

  return (
    <div
      ref={gridRef}
      role="group"
      aria-label="Últimas 12 semanas"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={BARS_GRID}
    >
      {days.map((day) => {
        if (day.isFuture) return <span key={day.day} aria-hidden className={cn(BAR, 'bg-heatmap-0 opacity-40')} />

        const sets = setsOf(day.day)
        const className = cn(BAR, LEVEL_CLASSES[heatmapLevel(sets)], day.day === selected && SELECTED_CLASSES)
        if (sets === 0) return <span key={day.day} aria-hidden data-day={day.day} className={className} />
        return (
          <button
            key={day.day}
            type="button"
            data-day={day.day}
            tabIndex={day.day === tabStop ? 0 : -1}
            aria-label={formatHeatmapDayLabel(day.day, sets)}
            aria-pressed={day.day === selected}
            className={cn(
              className,
              'touch-manipulation outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            )}
          />
        )
      })}
    </div>
  )
}

// The bars keep the mockup's shape at every width: twice as wide as tall, so
// the grid grows with the card instead of turning into thin stripes on desktop.
// 3px gaps on a phone, 4px from 640px.
const BARS_GRID = 'grid grid-flow-col grid-cols-12 grid-rows-7 gap-[3px] sm:gap-1'
const BAR = 'block aspect-[2/1] w-full rounded-[3px]'

// The bars' skeleton: the same grid, invisible, under one pulsing block, so it
// is exactly as tall as the bars at any width.
export function HeatmapBarsSkeleton() {
  return (
    <div aria-hidden className="relative">
      <div className={cn(BARS_GRID, 'invisible')}>
        {Array.from({ length: 84 }, (_, index) => (
          <span key={index} className={BAR} />
        ))}
      </div>
      <Skeleton className="absolute inset-0" />
    </div>
  )
}
