import { useId, useMemo, useState } from 'react'
import { cn } from 'cn'
import { Link } from 'react-router'
import { ErrorState } from '@/components/error-state'
import { OfflineState } from '@/components/offline-state'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CALENDAR_HINT, CalendarDayDetails } from '@/features/workout/components/calendar-day-details'
import {
  CalendarGrid,
  CalendarSkeleton,
  CalendarStateBox,
  MonthCalendar,
} from '@/features/workout/components/month-calendar'
import { useActiveWorkout } from '@/features/workout/hooks/use-active-workout'
import { useFirstWorkoutMonth, useMonthWorkouts } from '@/features/workout/hooks/use-workout-history'
import { useRoutines } from '@/features/workout/hooks/use-workout-queries'
import {
  addMonths,
  calendarWeeks,
  countTrainingDays,
  countTrainingDaysThisWeek,
  dayTotals,
  followCurrentMonth,
  formatDayAnnouncement,
  formatMonthSummary,
  formatMonthTitle,
  formatWeekGoal,
  monthOf,
  startOfWeek,
  type Month,
} from '@/features/workout/lib/history'
import { useNow } from '@/hooks/use-now'
import { toISODate } from '@/lib/format'
import { isWaitingForNetwork } from '@/lib/query-state'

// The top of Home, as in the "Graphite" mockup (rules AX, AU and AV): this
// week against the goal ("2 de 5 treinos"), a month's calendar, where tapping a
// day shows its workouts, and the way into a workout. The goal is the number of
// active routines; the count is the days with a workout this week, the ones
// waiting to be sent included. No sheet, so the drawer stays out of the main
// chunk.
export function HomeWeekCard() {
  const now = useNow()
  const titleId = useId()
  const routines = useRoutines()
  const workout = useActiveWorkout()

  const current = monthOf(now)
  const [viewed, setViewed] = useState<Month>(current)
  const [selected, setSelected] = useState<string | null>(null)
  // A new month while the app stayed open (useNow ticks every minute and when
  // the app comes back to the foreground): a calendar on the month that was
  // current moves to the new one and clears its selection; one the user moved
  // to another month stays. Adjusted while rendering, as React suggests for
  // state that follows a changing value, so the old month never paints.
  const [seenCurrent, setSeenCurrent] = useState<Month>(current)
  if (seenCurrent !== current) {
    setSeenCurrent(current)
    const next = followCurrentMonth(viewed, seenCurrent, current)
    if (next !== viewed) {
      setViewed(next)
      setSelected(null)
    }
  }
  // Never past this month, even if the clock went back.
  const month = viewed > current ? current : viewed
  // Read out when a day is selected or cleared (empty until then, so nothing is
  // said when the card appears).
  const [announcement, setAnnouncement] = useState('')

  // This week may start in the month before, so both are read for the count.
  const thisMonth = useMonthWorkouts(current)
  const monthBefore = useMonthWorkouts(addMonths(current, -1))
  const shown = useMonthWorkouts(month)
  const firstMonth = useFirstWorkoutMonth()

  const weekStartsBefore = toISODate(startOfWeek(now)) < `${current}-01`
  const beforeStalled = monthBefore.query.isError || isWaitingForNetwork(monthBefore.query)
  // Waits for the month before only when the week starts in it and it may still
  // come; without it (an error, or no network and no copy) it counts this
  // month's days.
  const weekTotals = useMemo(() => {
    if (!thisMonth.records) return null
    if (!weekStartsBefore) return dayTotals(thisMonth.records)
    if (!monthBefore.records && !beforeStalled) return null
    return dayTotals([...thisMonth.records, ...(monthBefore.records ?? [])])
  }, [thisMonth.records, monthBefore.records, weekStartsBefore, beforeStalled])
  const totals = useMemo(() => dayTotals(shown.records ?? []), [shown.records])
  const weeks = calendarWeeks(month, now)

  // Unknown while the routines load; without them (an error, or no network and
  // no copy) the headline goes on without a goal.
  const goal = routines.data ? routines.data.filter((routine) => !routine.archived_at).length : null
  const goalPending = routines.isPending && !routines.isError && !isWaitingForNetwork(routines)
  const headline = weekTotals && !goalPending ? formatWeekGoal(countTrainingDaysThisWeek(now, weekTotals), goal) : null
  // Without this month and no hope of it for now (no network, or an error), a
  // still dash instead of a skeleton that would pulse for good.
  const stalled = !thisMonth.records && (isWaitingForNetwork(thisMonth.query) || thisMonth.query.isError)

  // ‹ stops at the first workout's month (this one with none yet); while that
  // is unknown it stays on, and a month not on the device without network
  // shows the offline state.
  const canGoBack = firstMonth.data === undefined ? true : firstMonth.data !== null && month > firstMonth.data
  const canGoForward = month < current

  // Only a day of the month shown, and not one still to come, stays selected.
  const selectedDay =
    selected && weeks.flat().some((day) => day.day === selected && day.inMonth && !day.isFuture) ? selected : null

  function select(day: string | null) {
    setSelected(day)
    setAnnouncement(day ? formatDayAnnouncement(day, totals.get(day)?.workouts ?? []) : CALENDAR_HINT)
  }

  // Changing month clears the selection; the title is read out instead.
  function changeMonth(next: Month) {
    setViewed(next)
    setSelected(null)
  }

  return (
    <section aria-labelledby={titleId}>
      <Card>
        <div className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-0.5">
            <h2 id={titleId} className="text-sm text-muted-foreground">
              Esta semana
            </h2>
            <div className="flex min-h-8 items-end">
              {headline ? (
                <p className="text-2xl font-semibold tracking-tight tabular-nums">{headline}</p>
              ) : stalled ? (
                <p aria-hidden className="text-2xl font-semibold tracking-tight text-muted-foreground">
                  —
                </p>
              ) : (
                <div aria-hidden className="flex h-8 items-center">
                  <Skeleton className="h-6 w-36" />
                </div>
              )}
            </div>
          </div>

          {/* Side by side from 1024px, so the day's line fills the card's other half. */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
            <MonthCalendar month={month} canGoBack={canGoBack} canGoForward={canGoForward} onMonthChange={changeMonth}>
              {shown.records ? (
                <div>
                  <p className="sr-only">{formatMonthSummary(month, countTrainingDays(totals), now)}</p>
                  <CalendarGrid
                    weeks={weeks}
                    totals={totals}
                    label={formatMonthTitle(month)}
                    selected={selectedDay}
                    onSelect={select}
                  />
                </div>
              ) : isWaitingForNetwork(shown.query) ? (
                <CalendarStateBox>
                  <OfflineState />
                </CalendarStateBox>
              ) : shown.query.isError ? (
                <CalendarStateBox>
                  <ErrorState onRetry={() => void shown.query.refetch()} />
                </CalendarStateBox>
              ) : (
                <CalendarSkeleton />
              )}
            </MonthCalendar>

            {/* From 1024px the day's name lines up with the month's title. */}
            <div className="lg:min-w-0 lg:flex-1 lg:pt-3">
              {shown.records ? (
                <CalendarDayDetails
                  day={selectedDay}
                  workouts={selectedDay ? (totals.get(selectedDay)?.workouts ?? []) : []}
                  announcement={announcement}
                />
              ) : (
                // The day's line keeps its space while the grid cannot show.
                <div aria-hidden className="min-h-17" />
              )}
            </div>
          </div>

          <Link
            to={workout ? '/treino/em-curso' : '/treino'}
            className={cn(buttonVariants({ size: 'lg' }), 'h-12 w-full rounded-xl text-base pointer-coarse:h-12')}
          >
            {workout ? 'Continuar treino' : 'Iniciar treino'}
          </Link>
        </div>
      </Card>
    </section>
  )
}
