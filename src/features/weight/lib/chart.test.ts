import { describe, expect, it } from 'vitest'
import {
  chartPoints,
  movingAverage,
  showDailyDot,
  timeDomain,
  timeTicks,
  weightDomain,
  weightTicks,
  type ChartPoint,
} from '@/features/weight/lib/chart'
import type { WeightEntry } from '@/features/weight/lib/entries'
import { dayTime } from '@/features/weight/lib/lisbon-day'

const entry = (day: string, tenths: number): WeightEntry => ({ id: day, day, tenths })

describe('movingAverage', () => {
  it('has no value with fewer than 3 entries in the window', () => {
    const averages = movingAverage([entry('2026-11-01', 800), entry('2026-11-02', 790)])
    expect(averages.size).toBe(0)
  })

  it('is the mean of the window from the third entry on', () => {
    const averages = movingAverage([entry('2026-11-01', 800), entry('2026-11-02', 790), entry('2026-11-03', 780)])
    expect([...averages]).toEqual([['2026-11-03', 790]])
  })

  it('counts 7 calendar days, the day itself included', () => {
    const inside = movingAverage([entry('2026-11-04', 800), entry('2026-11-07', 790), entry('2026-11-10', 780)])
    expect(inside.get('2026-11-10')).toBe(790)

    const outside = movingAverage([entry('2026-11-03', 800), entry('2026-11-07', 790), entry('2026-11-10', 780)])
    expect(outside.has('2026-11-10')).toBe(false)
  })

  it('keeps the fraction, for whoever shows it to round', () => {
    const averages = movingAverage([entry('2026-11-01', 800), entry('2026-11-02', 800), entry('2026-11-03', 801)])
    expect(averages.get('2026-11-03')).toBeCloseTo(800.333, 3)
  })

  it('never gives a value to a day without an entry', () => {
    const averages = movingAverage([
      entry('2026-11-01', 800),
      entry('2026-11-02', 800),
      entry('2026-11-03', 800),
      entry('2026-11-05', 800),
    ])
    expect([...averages.keys()]).toEqual(['2026-11-03', '2026-11-05'])
  })

  it('counts calendar days across the change to summer time', () => {
    const averages = movingAverage([entry('2026-03-26', 800), entry('2026-03-29', 790), entry('2026-04-01', 780)])
    expect(averages.get('2026-04-01')).toBe(790)
  })
})

describe('chartPoints', () => {
  const today = '2026-11-17'

  it('has one point per entry in the period, in kg, at its date', () => {
    const points = chartPoints([entry('2026-11-16', 785), entry('2026-11-17', 784), entry('2026-09-01', 800)], '1M', today)
    expect(points).toEqual([
      { time: dayTime('2026-11-16'), day: '2026-11-16', weight: 78.5, average: null },
      { time: dayTime('2026-11-17'), day: '2026-11-17', weight: 78.4, average: null },
    ])
  })

  it('uses the entries just before the period for the first averages', () => {
    const points = chartPoints(
      [entry('2026-10-15', 800), entry('2026-10-16', 800), entry('2026-10-17', 791)],
      '1M',
      today,
    )
    expect(points).toEqual([{ time: dayTime('2026-10-17'), day: '2026-10-17', weight: 79.1, average: 79.7 }])
  })

  it('joins entries up to 3 days apart, with no point on the days between', () => {
    const points = chartPoints([entry('2026-11-10', 790), entry('2026-11-13', 788)], '1M', today)
    expect(points.map((point) => point.day)).toEqual(['2026-11-10', '2026-11-13'])
  })

  it('breaks the lines on a longer gap with an empty point the day after', () => {
    const points = chartPoints([entry('2026-11-10', 790), entry('2026-11-14', 788)], '1M', today)
    expect(points).toEqual([
      { time: dayTime('2026-11-10'), day: '2026-11-10', weight: 79, average: null },
      { time: dayTime('2026-11-11'), day: '2026-11-11', weight: null, average: null },
      { time: dayTime('2026-11-14'), day: '2026-11-14', weight: 78.8, average: null },
    ])
  })

  it('is empty without entries in the period', () => {
    expect(chartPoints([entry('2026-08-01', 800)], '1M', today)).toEqual([])
    expect(chartPoints([], 'all', today)).toEqual([])
  })
})

const point = (day: string, weight: number | null, average: number | null = null): ChartPoint => ({
  time: dayTime(day),
  day,
  weight,
  average,
})

describe('timeDomain', () => {
  it('goes from the first day to today', () => {
    expect(timeDomain('2026-10-17', '2026-11-17')).toEqual([dayTime('2026-10-17'), dayTime('2026-11-17')])
  })

  it('widens a single day by three days on each side', () => {
    expect(timeDomain('2026-11-17', '2026-11-17')).toEqual([dayTime('2026-11-14'), dayTime('2026-11-20')])
  })
})

describe('timeTicks', () => {
  it('spreads four days from start to end, both included', () => {
    expect(timeTicks('2026-10-17', '2026-11-17')).toEqual(['2026-10-17', '2026-10-27', '2026-11-07', '2026-11-17'])
  })

  it('never repeats a day on a short span', () => {
    expect(timeTicks('2026-11-16', '2026-11-17')).toEqual(['2026-11-16', '2026-11-17'])
  })

  it('has one tick for a single day', () => {
    expect(timeTicks('2026-11-17', '2026-11-17')).toEqual(['2026-11-17'])
  })
})

describe('weightDomain and weightTicks', () => {
  it('gives a single value the whole kg around it', () => {
    const domain = weightDomain([point('2026-11-17', 78.4)])
    expect(domain).toEqual([78, 79])
    expect(weightTicks(domain!)).toEqual([78, 79])
  })

  it('gives a single whole value a kg on each side', () => {
    expect(weightDomain([point('2026-11-17', 78)])).toEqual([77, 79])
  })

  it('covers the daily values and the averages, with no extra room', () => {
    const domain = weightDomain([point('2026-11-15', 79.6, 80), point('2026-11-17', 78.2, 78.9)])
    expect(domain).toEqual([78, 80])
    expect(weightTicks(domain!)).toEqual([78, 79, 80])
  })

  it('ignores the empty points that break the lines', () => {
    expect(weightDomain([point('2026-11-10', null), point('2026-11-17', 78.4)])).toEqual([78, 79])
  })

  it('is null without values', () => {
    expect(weightDomain([])).toBeNull()
  })

  it('takes the smallest round step that fits in five ticks', () => {
    expect(weightTicks([75, 82])).toEqual([74, 76, 78, 80, 82])
    expect(weightTicks([77, 82])).toEqual([76, 78, 80, 82])
    expect(weightTicks([70, 82])).toEqual([70, 75, 80, 85])
  })
})

describe('showDailyDot', () => {
  it('shows every dot up to the limit', () => {
    const points = [point('2026-11-16', 78.5), point('2026-11-17', 78.4)]
    expect(showDailyDot(points, 0)).toBe(true)
    expect(showDailyDot(points, 1)).toBe(true)
  })

  it('never shows a dot for an empty point', () => {
    expect(showDailyDot([point('2026-11-11', null)], 0)).toBe(false)
  })

  it('above the limit, shows only isolated values', () => {
    const many = Array.from({ length: 130 }, (_, index) => point(`d${index}`, 78))
    many[60] = point('gap', null)
    many[62] = point('gap', null)
    expect(showDailyDot(many, 10)).toBe(false)
    expect(showDailyDot(many, 61)).toBe(true)
  })
})
