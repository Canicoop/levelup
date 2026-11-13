import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  calendarWeeks,
  countTrainingDays,
  countTrainingDaysThisWeek,
  dayTotals,
  followCurrentMonth,
  formatDayAnnouncement,
  formatDayLabel,
  formatMonthSummary,
  formatMonthTitle,
  formatWeekGoal,
  formatHeatmapDayLabel,
  formatRecordSummary,
  formatRelativeDay,
  formatWorkoutDateTime,
  formatWorkoutSets,
  formatLastWorkoutDetails,
  heatmapLevel,
  inMonth,
  latestWorkout,
  mergeWithPending,
  monthOf,
  monthReadRange,
  monthStart,
  pendingAsRecords,
  startOfWeek,
  toWorkoutRecord,
  workoutDay,
  type WorkoutRecord,
} from '@/features/workout/lib/history'
import type { PendingWorkout } from '@/features/workout/lib/pending-workouts'
import { toISODate } from '@/lib/format'

// Tests run in Europe/Lisbon: UTC in winter, UTC+1 in summer. In 2026 the clocks
// go forward on 29 March and back on 25 October.

// A local date and time, as the device sees it.
function local(day: string, time = '12:00') {
  return new Date(`${day}T${time}:00`)
}

function record(id: string, startedAt: string, sets: number, finishedAt = startedAt): WorkoutRecord {
  return {
    id,
    routineName: 'Push',
    startedAt,
    finishedAt,
    exercises: [{ exerciseId: 'a', name: 'Supino', sets: Array.from({ length: sets }, () => ({ weightKg: 60, reps: 8 })) }],
  }
}

describe('toWorkoutRecord', () => {
  it('orders the exercises and sets by position, and reads the names', () => {
    expect(
      toWorkoutRecord({
        id: 'w1',
        started_at: '2026-11-03T18:00:00+00:00',
        finished_at: '2026-11-03T19:05:00+00:00',
        routine: { name: 'Upper' },
        workout_exercises: [
          { exercise_id: 'b', position: 1, exercise: { name: 'Remada' }, workout_sets: [{ position: 0, weight_kg: 50, reps: 10 }] },
          {
            exercise_id: 'a',
            position: 0,
            exercise: { name: 'Supino' },
            workout_sets: [
              { position: 1, weight_kg: 60, reps: 7 },
              { position: 0, weight_kg: 60, reps: 8 },
            ],
          },
        ],
      }),
    ).toEqual({
      id: 'w1',
      routineName: 'Upper',
      startedAt: '2026-11-03T18:00:00+00:00',
      finishedAt: '2026-11-03T19:05:00+00:00',
      exercises: [
        {
          exerciseId: 'a',
          name: 'Supino',
          sets: [
            { weightKg: 60, reps: 8 },
            { weightKg: 60, reps: 7 },
          ],
        },
        { exerciseId: 'b', name: 'Remada', sets: [{ weightKg: 50, reps: 10 }] },
      ],
    })
  })
})

describe('startOfWeek', () => {
  it.each([
    ['a Wednesday', '2026-11-11', '2026-11-09'],
    ['a Monday', '2026-11-09', '2026-11-09'],
    ['a Sunday, the last day of its week', '2026-11-15', '2026-11-09'],
    ['the Sunday the clocks go forward', '2026-03-29', '2026-03-23'],
    ['the day after the clocks go back', '2026-10-26', '2026-10-26'],
    ['across a new year', '2027-01-01', '2026-12-28'],
  ])('is the Monday for %s', (_label, day, monday) => {
    expect(toISODate(startOfWeek(local(day)))).toBe(monday)
  })

  it('is midnight, even late at night', () => {
    const start = startOfWeek(local('2026-11-11', '23:59'))
    expect([start.getHours(), start.getMinutes()]).toEqual([0, 0])
  })
})

describe('addDays', () => {
  it('moves by calendar days across a clock change', () => {
    expect(toISODate(addDays(local('2026-03-28', '00:30'), 1))).toBe('2026-03-29')
    expect(toISODate(addDays(local('2026-03-29', '00:30'), 1))).toBe('2026-03-30')
    expect(toISODate(addDays(local('2026-10-25', '00:30'), 1))).toBe('2026-10-26')
  })
})

describe('workoutDay', () => {
  it('is the local day the workout started, even when it ends after midnight', () => {
    expect(workoutDay({ startedAt: '2026-11-03T23:50:00Z' })).toBe('2026-11-03')
  })

  it('uses local time, not UTC, in summer', () => {
    // 23:30 UTC is 00:30 the next day in Lisbon.
    expect(workoutDay({ startedAt: '2026-07-01T23:30:00Z' })).toBe('2026-07-02')
  })

  it('handles the nights the clocks change', () => {
    expect(workoutDay({ startedAt: '2026-03-29T00:30:00Z' })).toBe('2026-03-29')
    expect(workoutDay({ startedAt: '2026-10-24T23:30:00Z' })).toBe('2026-10-25')
  })
})

describe('months', () => {
  it('names a month by its local date', () => {
    expect(monthOf(local('2026-11-30', '23:59'))).toBe('2026-11')
    expect(monthOf(local('2026-12-01', '00:00'))).toBe('2026-12')
  })

  it('moves by calendar months, across a year', () => {
    expect(addMonths('2026-11', -1)).toBe('2026-10')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(toISODate(monthStart('2026-03'))).toBe('2026-03-01')
  })

  it('reads a day past the month, for a workout that ends after midnight', () => {
    const { from, until } = monthReadRange('2026-10')
    expect(from).toEqual(local('2026-10-01', '00:00'))
    expect(until).toEqual(local('2026-11-02', '00:00'))
  })

  it('keeps the workouts that started in the month, by the local day', () => {
    // 23:50 on 31 October in Lisbon (UTC in winter), ending in November.
    const late = record('late', '2026-10-31T23:50:00Z', 3, '2026-11-01T00:40:00Z')
    const november = record('nov', '2026-11-01T09:00:00Z', 3)
    // 23:30 on 30 September in UTC is already 1 October in Lisbon (UTC+1 in summer).
    const october = record('oct', '2026-09-30T23:30:00Z', 3)
    expect(inMonth([late, november, october], '2026-10').map((r) => r.id)).toEqual(['late', 'oct'])
    expect(inMonth([late, november, october], '2026-11').map((r) => r.id)).toEqual(['nov'])
  })

  it('follows a new month only from the month that was current', () => {
    // Left open on November, 1 December arrives: it moves to December.
    expect(followCurrentMonth('2026-11', '2026-11', '2026-12')).toBe('2026-12')
    // Across a year.
    expect(followCurrentMonth('2026-12', '2026-12', '2027-01')).toBe('2027-01')
    // The user was looking at October: it stays there.
    expect(followCurrentMonth('2026-10', '2026-11', '2026-12')).toBe('2026-10')
    // No new month: nothing moves.
    expect(followCurrentMonth('2026-10', '2026-11', '2026-11')).toBe('2026-10')
    // A clock that went back a month takes a calendar on the current month with it.
    expect(followCurrentMonth('2026-12', '2026-12', '2026-11')).toBe('2026-11')
  })

  it('titles the month without "de"', () => {
    expect(formatMonthTitle('2026-11')).toBe('Novembro 2026')
    expect(formatMonthTitle('2027-01')).toBe('Janeiro 2027')
  })

  it.each([
    ['2026-11', 0, 'Em novembro ainda não treinaste.'],
    ['2026-10', 0, 'Em outubro não treinaste.'],
    ['2026-11', 1, 'Em novembro treinaste em 1 dia.'],
    ['2026-10', 9, 'Em outubro treinaste em 9 dias.'],
  ])('sums up %s with %i days for screen readers', (month, days, text) => {
    expect(formatMonthSummary(month, days, local('2026-11-11'))).toBe(text)
  })
})

describe('calendarWeeks', () => {
  const today = local('2026-11-11')

  it('always has 6 weeks of 7 days, from Monday to Sunday', () => {
    for (const month of ['2026-02', '2026-11', '2027-03']) {
      const weeks = calendarWeeks(month, today)
      expect(weeks).toHaveLength(6)
      expect(weeks.every((week) => week.length === 7)).toBe(true)
      expect(local(weeks[0][0].day).getDay()).toBe(1)
    }
  })

  it('starts on the Monday on or before the 1st, with the days around it marked', () => {
    // 1 November 2026 is a Sunday.
    const days = calendarWeeks('2026-11', today).flat()
    expect(days[0].day).toBe('2026-10-26')
    expect(days[6]).toMatchObject({ day: '2026-11-01', date: 1, inMonth: true })
    expect(days.filter((day) => day.inMonth)).toHaveLength(30)
    expect(days.at(-1)).toMatchObject({ day: '2026-12-06', date: 6, inMonth: false })
  })

  it('fits a month that takes 4 rows, with 2 rows left empty', () => {
    // February 2027 starts on a Monday and has 28 days.
    const weeks = calendarWeeks('2027-02', today)
    expect(weeks[0][0].day).toBe('2027-02-01')
    expect(weeks.slice(4).flat().every((day) => !day.inMonth)).toBe(true)
  })

  it('marks today and the days after it', () => {
    const days = calendarWeeks('2026-11', today).flat()
    expect(days.filter((day) => day.isToday).map((day) => day.day)).toEqual(['2026-11-11'])
    expect(days.find((day) => day.day === '2026-11-12')?.isFuture).toBe(true)
    expect(days.find((day) => day.day === '2026-11-10')?.isFuture).toBe(false)
  })

  it('has every day once, across the clocks going back and forward', () => {
    const october = calendarWeeks('2026-10', today).flat()
    expect(new Set(october.map((day) => day.day)).size).toBe(42)
    const index = october.findIndex((day) => day.day === '2026-10-25')
    expect(october[index + 1].day).toBe('2026-10-26')
    const march = calendarWeeks('2026-03', today).flat()
    expect(march.filter((day) => day.day >= '2026-03-23' && day.day <= '2026-03-29')).toHaveLength(7)
  })
})

describe('dayTotals and heatmapLevel', () => {
  it('adds the sets of every workout of a day, the most recent first', () => {
    const morning = record('m', '2026-11-03T08:00:00Z', 4, '2026-11-03T09:00:00Z')
    const evening = record('e', '2026-11-03T19:00:00Z', 7, '2026-11-03T20:00:00Z')
    const other = record('o', '2026-11-04T19:00:00Z', 3)
    const totals = dayTotals([morning, other, evening])
    expect(totals.get('2026-11-03')?.sets).toBe(11)
    expect(totals.get('2026-11-03')?.workouts.map((w) => w.id)).toEqual(['e', 'm'])
    expect(totals.get('2026-11-04')?.sets).toBe(3)
    expect(totals.has('2026-11-05')).toBe(false)
  })

  it.each([
    [0, 0],
    [1, 1],
    [9, 1],
    [10, 2],
    [19, 2],
    [20, 3],
    [45, 3],
  ])('%i sets is level %i', (sets, level) => {
    expect(heatmapLevel(sets)).toBe(level)
  })
})

describe('latestWorkout', () => {
  const newer = record('n', '2026-11-10T18:00:00Z', 3)
  const older = record('o', '2026-07-01T18:00:00Z', 3)

  it('is the most recent of both reads', () => {
    expect(latestWorkout([newer], [newer, older])?.id).toBe('n')
  })

  it('comes from the history when this month is empty', () => {
    expect(latestWorkout([], [older])?.id).toBe('o')
  })

  it('keeps the waiting workout and its mark', () => {
    const waiting = { ...record('p', '2026-11-11T00:05:00Z', 3), pending: true as const }
    expect(latestWorkout([waiting, newer], [waiting, newer])).toEqual(waiting)
  })

  it('is null with no workouts', () => {
    expect(latestWorkout([], [])).toBeNull()
  })
})

describe('the week on Home', () => {
  it('counts days with a workout this week, not workouts', () => {
    const totals = dayTotals([
      record('a', '2026-11-09T08:00:00Z', 3),
      record('b', '2026-11-09T19:00:00Z', 3),
      record('c', '2026-11-11T19:00:00Z', 5),
      // Sunday of last week: not this week.
      record('d', '2026-11-08T19:00:00Z', 5),
    ])
    expect(countTrainingDaysThisWeek(local('2026-11-11'), totals)).toBe(2)
  })

  it.each([
    [2, 5, '2 de 5 treinos'],
    [0, 5, '0 de 5 treinos'],
    [1, 1, '1 de 1 treino'],
    [6, 4, '6 de 4 treinos'],
    [2, 0, '2 esta semana'],
    [0, 0, '0 esta semana'],
    [3, null, '3 esta semana'],
  ])('%i days with a goal of %s reads "%s"', (days, goal, text) => {
    expect(formatWeekGoal(days, goal)).toBe(text)
  })

  it('counts the days with a workout in a month', () => {
    const totals = dayTotals([
      record('a', '2026-11-09T08:00:00Z', 3),
      record('b', '2026-11-09T19:00:00Z', 3),
      record('c', '2026-10-01T19:00:00Z', 5),
    ])
    expect(countTrainingDays(totals)).toBe(2)
    expect(countTrainingDays(new Map())).toBe(0)
  })
})

describe('formatDayAnnouncement', () => {
  it('names the day and each workout with its sets, marking the waiting ones', () => {
    const pull = { ...record('a', '2026-11-03T19:00:00Z', 12), routineName: 'Pull' }
    const push = { ...record('b', '2026-11-03T08:00:00Z', 6), pending: true as const }
    expect(formatDayAnnouncement('2026-11-03', [pull, push])).toBe(
      'Terça-feira, 3 de novembro: Pull, 12 séries; Push, 6 séries, por enviar',
    )
  })

  it('says when there was no workout', () => {
    expect(formatDayAnnouncement('2026-11-05', [])).toBe('Quinta-feira, 5 de novembro: sem treino')
  })
})

describe('formatRelativeDay', () => {
  const now = local('2026-11-11', '10:00')

  it.each([
    ['earlier today', '2026-11-11T07:00:00Z', 'hoje'],
    ['yesterday, late at night', '2026-11-10T23:50:00Z', 'ontem'],
    ['two days ago', '2026-11-09T19:00:00Z', 'segunda-feira'],
    ['six days ago', '2026-11-05T19:00:00Z', 'quinta-feira'],
    ['a week ago', '2026-11-04T19:00:00Z', '4 de novembro'],
    ['another year', '2025-11-03T19:00:00Z', '3 de novembro de 2025'],
    ['a date ahead (a clock that went back)', '2026-11-13T19:00:00Z', '13 de novembro'],
  ])('reads %s', (_label, iso, text) => {
    expect(formatRelativeDay(iso, now)).toBe(text)
  })

  it('counts calendar days across a clock change', () => {
    expect(formatRelativeDay('2026-03-29T00:30:00Z', local('2026-03-30', '00:10'))).toBe('ontem')
  })
})

describe('formatWorkoutSets and formatLastWorkoutDetails', () => {
  it('lists the sets with the weight in European Portuguese', () => {
    expect(
      formatWorkoutSets([
        { weightKg: 60, reps: 8 },
        { weightKg: 22.5, reps: 7 },
        { weightKg: 55, reps: 8 },
      ]),
    ).toBe('60 × 8 · 22,5 × 7 · 55 × 8')
  })

  it('reads the last workout as day, exercises and duration, capitalised', () => {
    const last = record('w', '2026-11-10T18:00:00Z', 3, '2026-11-10T18:52:00Z')
    expect(formatLastWorkoutDetails(last, local('2026-11-11'))).toBe('Ontem · 1 exercício · 52 min')
    const short = record('s', '2026-11-11T08:00:00Z', 1, '2026-11-11T08:00:40Z')
    expect(formatLastWorkoutDetails(short, local('2026-11-11', '10:00'))).toBe('Hoje · 1 exercício · menos de 1 min')
  })
})

describe('the labels of a day and a workout', () => {
  it('names a heatmap day, capitalised', () => {
    expect(formatDayLabel('2026-11-03')).toBe('Terça-feira, 3 de novembro')
  })

  it.each([
    [18, 'Terça-feira, 3 de novembro: 18 séries'],
    [1, 'Terça-feira, 3 de novembro: 1 série'],
    [0, 'Terça-feira, 3 de novembro: sem treino'],
  ])('reads a day with %i sets as "%s"', (sets, text) => {
    expect(formatHeatmapDayLabel('2026-11-03', sets)).toBe(text)
  })

  it('reads a workout start with the day and the local time', () => {
    expect(formatWorkoutDateTime('2026-11-03T19:42:00Z', local('2026-11-11'))).toBe('terça-feira, 3 de novembro, 19:42')
    expect(formatWorkoutDateTime('2026-07-01T18:05:00Z', local('2026-11-11'))).toBe('quarta-feira, 1 de julho, 19:05')
  })

  it('adds the year for another year', () => {
    expect(formatWorkoutDateTime('2025-11-03T19:42:00Z', local('2026-11-11'))).toBe(
      'segunda-feira, 3 de novembro de 2025, 19:42',
    )
  })

  it('sums up a history row', () => {
    const row: WorkoutRecord = {
      ...record('w', '2026-11-10T18:00:00Z', 3, '2026-11-10T19:05:00Z'),
      exercises: [
        { exerciseId: 'a', name: 'Supino', sets: [{ weightKg: 60, reps: 8 }, { weightKg: 60, reps: 7 }] },
        { exerciseId: 'b', name: 'Remada', sets: [{ weightKg: 50, reps: 10 }] },
      ],
    }
    expect(formatRecordSummary(row, local('2026-11-11'))).toBe('ontem · 1 h 05 min · 2 exercícios · 3 séries')
  })
})

function queued(id: string, finishedAt: string, rejected = false): PendingWorkout {
  return {
    payload: {
      id,
      routine_id: 'r',
      started_at: '2026-11-11T18:00:00.000Z',
      finished_at: finishedAt,
      exercises: [{ exercise_id: 'a', sets: [{ weight_kg: '22.5', reps: 8 }] }],
    },
    routineName: 'Legs',
    exerciseNames: { a: 'Agachamento' },
    ...(rejected ? { rejected: { code: '23514', at: finishedAt } } : {}),
  }
}

describe('pendingAsRecords and mergeWithPending', () => {
  it('turns the waiting workouts into records marked as pending, leaving out refused ones', () => {
    expect(pendingAsRecords([queued('p1', '2026-11-11T19:00:00.000Z'), queued('p2', '2026-11-11T19:30:00.000Z', true)])).toEqual([
      {
        id: 'p1',
        routineName: 'Legs',
        startedAt: '2026-11-11T18:00:00.000Z',
        finishedAt: '2026-11-11T19:00:00.000Z',
        exercises: [{ exerciseId: 'a', name: 'Agachamento', sets: [{ weightKg: 22.5, reps: 8 }] }],
        pending: true,
      },
    ])
  })

  it('lays them over the records, the most recent first', () => {
    const older = record('s1', '2026-11-09T19:00:00Z', 3)
    const newer = record('s2', '2026-11-10T19:00:00Z', 3)
    const merged = mergeWithPending([older, newer], pendingAsRecords([queued('p1', '2026-11-11T19:00:00.000Z')]))
    expect(merged.map((r) => [r.id, r.pending ?? false])).toEqual([
      ['p1', true],
      ['s2', false],
      ['s1', false],
    ])
  })

  it('keeps the database record when a workout is in both', () => {
    const sent = record('p1', '2026-11-11T18:00:00.000Z', 1, '2026-11-11T19:00:00.000Z')
    const merged = mergeWithPending([sent], pendingAsRecords([queued('p1', '2026-11-11T19:00:00.000Z')]))
    expect(merged).toEqual([sent])
  })
})
