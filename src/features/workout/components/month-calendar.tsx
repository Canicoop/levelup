import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { cn } from 'cn'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { LEVEL_CLASSES, LEVEL_TEXT_CLASSES, SELECTED_CLASSES } from '@/features/workout/components/calendar-styles'
import {
  addMonths,
  formatCalendarDayLabel,
  formatMonthTitle,
  heatmapLevel,
  type CalendarDay,
  type DayTotal,
  type Month,
} from '@/features/workout/lib/history'

type MonthCalendarProps = {
  month: Month
  canGoBack: boolean
  canGoForward: boolean
  onMonthChange: (month: Month) => void
  // The grid, or the state shown in its place (CalendarStateBox).
  children: ReactNode
}

// Home's calendar (rule AU): one month, "‹ Novembro 2026 ›", the weekdays, and
// the days below. At most 7 × 56px wide, so on a desktop the days stay squares
// a finger or a pointer can hit, not stripes; on a phone they fill the card.
export function MonthCalendar({ month, canGoBack, canGoForward, onMonthChange, children }: MonthCalendarProps) {
  return (
    <div className="flex w-full max-w-[24.5rem] flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <MonthButton label="Mês anterior" disabled={!canGoBack} onClick={() => onMonthChange(addMonths(month, -1))}>
          <ChevronLeft aria-hidden className="size-5" strokeWidth={1.75} />
        </MonthButton>
        {/* Read out when the month changes; the buttons keep the focus. */}
        <h3 aria-live="polite" className="text-base font-semibold tracking-tight">
          {formatMonthTitle(month)}
        </h3>
        <MonthButton label="Mês seguinte" disabled={!canGoForward} onClick={() => onMonthChange(addMonths(month, 1))}>
          <ChevronRight aria-hidden className="size-5" strokeWidth={1.75} />
        </MonthButton>
      </div>
      {/* Each day's label already says its weekday. */}
      <div aria-hidden className="grid grid-cols-7 text-center text-xs text-muted-foreground">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className="py-1">
            {weekday}
          </span>
        ))}
      </div>
      {children}
    </div>
  )
}

const WEEKDAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

function MonthButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-full text-muted-foreground outline-none select-none transition-[opacity,background-color,color] duration-150 ease-out hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring active:opacity-70 disabled:pointer-events-none disabled:opacity-30 motion-reduce:transition-none"
    >
      {children}
    </button>
  )
}

type CalendarGridProps = {
  // Always 6 weeks (calendarWeeks), so the grid keeps its height.
  weeks: CalendarDay[][]
  totals: Map<string, DayTotal>
  label: string
  selected: string | null
  // Tapping the selected day again clears it (null), as Escape does.
  onSelect: (day: string | null) => void
}

// The month's days, coloured by their sets in the heatmap's 4 levels. Each
// cell is a seventh of the width, all of it the touch area, with the colour
// drawn 2px inside, so there are no gaps to miss (about 44px a cell on a 375px
// iPhone, 46px on a 390px one). Days with a workout are buttons in the usual
// Tab order, read as "Terça-feira, 3 de novembro: 18 séries"; days without one
// select by touch or mouse only ("Sem treino") and hold nothing to read out.
// Days still to come are faint and do not react; days of other months are
// empty. Today has its number in bold with a dot under it; the ring is the
// selection's.
export function CalendarGrid({ weeks, totals, label, selected, onSelect }: CalendarGridProps) {
  // One handler for the whole grid: a tap, a click, or Enter and Space on a
  // button toggle the day they land on.
  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const day = (event.target as HTMLElement).closest<HTMLElement>('[data-day]')?.dataset.day
    if (day) onSelect(day === selected ? null : day)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape' || !selected) return
    event.preventDefault()
    onSelect(null)
  }

  return (
    <div role="group" aria-label={label} onClick={handleClick} onKeyDown={handleKeyDown} className="grid grid-cols-7">
      {weeks.flat().map((day) => (
        <CalendarCell key={day.day} day={day} sets={totals.get(day.day)?.sets ?? 0} selected={day.day === selected} />
      ))}
    </div>
  )
}

const CELL = 'block aspect-square w-full p-0.5'
const FACE =
  'relative flex size-full items-center justify-center rounded-lg text-sm tabular-nums transition-transform duration-150 ease-out motion-reduce:transition-none'

function CalendarCell({ day, sets, selected }: { day: CalendarDay; sets: number; selected: boolean }) {
  if (!day.inMonth) return <span aria-hidden className={CELL} />
  if (day.isFuture) {
    return (
      <span aria-hidden className={CELL}>
        <span className={cn(FACE, 'bg-heatmap-0/40 text-muted-foreground/60')}>{day.date}</span>
      </span>
    )
  }

  const level = heatmapLevel(sets)
  const face = (
    <span
      className={cn(
        FACE,
        LEVEL_CLASSES[level],
        LEVEL_TEXT_CLASSES[level],
        day.isToday && 'font-semibold',
        selected && SELECTED_CLASSES,
        sets > 0 &&
          'group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ring group-active:scale-95 motion-reduce:group-active:scale-100',
      )}
    >
      {day.date}
      {day.isToday && <span aria-hidden className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-current" />}
    </span>
  )

  if (sets === 0) {
    return (
      <span aria-hidden data-day={day.day} className={CELL}>
        {face}
      </span>
    )
  }
  return (
    <button
      type="button"
      data-day={day.day}
      aria-label={formatCalendarDayLabel(day.day, sets)}
      aria-pressed={selected}
      aria-current={day.isToday ? 'date' : undefined}
      className={cn(CELL, 'group touch-manipulation outline-none select-none')}
    >
      {face}
    </button>
  )
}

// Where the grid goes while it cannot show: loading, an error, or no network
// for a month not kept on the device. As tall as the 6 weeks, so the card does
// not move.
export function CalendarStateBox({ children }: { children: ReactNode }) {
  return <div className="flex aspect-[7/6] w-full items-center justify-center">{children}</div>
}

export function CalendarSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">A carregar…</span>
      <Skeleton aria-hidden className="aspect-[7/6] w-full rounded-lg" />
    </div>
  )
}
