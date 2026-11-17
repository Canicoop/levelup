import { describe, expect, it } from 'vitest'
import type { WeightEntry } from '@/features/weight/lib/entries'
import {
  formatAxisDay,
  formatChartDay,
  formatChartDescription,
  formatDeleteQuestion,
  formatEntryDate,
  formatEntryDay,
  formatHistoryDay,
  formatSummaryLine,
  homeWeightSummary,
} from '@/features/weight/lib/labels'

const entry = (day: string, tenths: number): WeightEntry => ({ id: day, day, tenths })
const today = '2026-11-17' // a Tuesday

describe('formatEntryDay', () => {
  it('says "hoje" and "ontem"', () => {
    expect(formatEntryDay('2026-11-17', today)).toBe('hoje')
    expect(formatEntryDay('2026-11-16', today)).toBe('ontem')
  })

  it('names the weekday from 2 to 6 days ago', () => {
    expect(formatEntryDay('2026-11-15', today)).toBe('domingo')
    expect(formatEntryDay('2026-11-11', today)).toBe('quarta-feira')
  })

  it('gives the date from 7 days ago, with the year when it is another', () => {
    expect(formatEntryDay('2026-11-10', today)).toBe('10 de novembro')
    expect(formatEntryDay('2025-11-17', today)).toBe('17 de novembro de 2025')
  })

  it('gives the date for a day after today', () => {
    expect(formatEntryDay('2026-11-18', today)).toBe('18 de novembro')
  })
})

describe('formatAxisDay', () => {
  it('labels a short span by day, without the dot of the short month', () => {
    expect(formatAxisDay('2026-11-17', 31)).toBe('17 nov')
    expect(formatAxisDay('2026-10-01', 92)).toBe('1 out')
  })

  it('labels a long span by month and year', () => {
    expect(formatAxisDay('2025-11-17', 365)).toBe('nov 2025')
  })
})

describe('formatChartDay', () => {
  it('gives the weekday and the date, with the year when it is another', () => {
    expect(formatChartDay('2026-11-17', today)).toBe('terça-feira, 17 de novembro')
    expect(formatChartDay('2025-11-17', today)).toBe('segunda-feira, 17 de novembro de 2025')
  })
})

describe('formatChartDescription', () => {
  it('gives the first and the last weight of the period', () => {
    expect(formatChartDescription('1M', [entry('2026-10-20', 796), entry(today, 784)])).toBe(
      'No último mês, o peso foi de 79,6 kg a 78,4 kg.',
    )
    expect(formatChartDescription('all', [entry('2025-01-02', 820), entry(today, 784)])).toBe(
      'Desde o primeiro registo, o peso foi de 82,0 kg a 78,4 kg.',
    )
  })

  it('names a single entry', () => {
    expect(formatChartDescription('3M', [entry(today, 784)])).toBe('Nos últimos 3 meses, há um registo: 78,4 kg.')
  })

  it('says when the period is empty', () => {
    expect(formatChartDescription('1A', [])).toBe('Sem registos neste período.')
  })
})

describe('formatEntryDate', () => {
  it('is always the date, with the year when it is another', () => {
    expect(formatEntryDate('2026-11-16', today)).toBe('16 de novembro')
    expect(formatEntryDate('2025-12-31', today)).toBe('31 de dezembro de 2025')
  })
})

describe('formatHistoryDay', () => {
  it('capitalises the relative day', () => {
    expect(formatHistoryDay('2026-11-17', today)).toBe('Hoje')
    expect(formatHistoryDay('2026-11-15', today)).toBe('Domingo')
  })

  it('leaves a date as it is', () => {
    expect(formatHistoryDay('2026-11-10', today)).toBe('10 de novembro')
  })
})

describe('formatSummaryLine', () => {
  it('gives the day and the difference since the period\'s first entry', () => {
    expect(formatSummaryLine('2026-11-17', -5, '2026-10-20', today)).toBe('hoje · −0,5 kg desde 20 de outubro')
  })

  it('names a recent start by its relative day', () => {
    expect(formatSummaryLine('2026-11-17', 0, '2026-11-16', today)).toBe('hoje · sem alteração desde ontem')
  })

  it('gives only the day without a difference', () => {
    expect(formatSummaryLine('2026-11-16', null, null, today)).toBe('ontem')
  })
})

describe('formatDeleteQuestion', () => {
  it('names today as "hoje"', () => {
    expect(formatDeleteQuestion('2026-11-17', today)).toBe('Apagar o registo de hoje?')
  })

  it('always uses the date otherwise, never a weekday', () => {
    expect(formatDeleteQuestion('2026-11-16', today)).toBe('Apagar o registo de 16 de novembro?')
    expect(formatDeleteQuestion('2026-11-03', today)).toBe('Apagar o registo de 3 de novembro?')
    expect(formatDeleteQuestion('2025-12-31', today)).toBe('Apagar o registo de 31 de dezembro de 2025?')
  })
})

describe('homeWeightSummary', () => {
  it('is null without entries', () => {
    expect(homeWeightSummary([], today)).toBeNull()
  })

  it('shows today\'s entry and its difference from the one before', () => {
    expect(homeWeightSummary([entry('2026-11-14', 789), entry(today, 784)], today)).toEqual({
      weight: '78,4 kg',
      day: 'hoje',
      difference: '−0,5 kg',
      loggedToday: true,
    })
  })

  it('says when the latest entry is not today, with no difference for a single entry', () => {
    expect(homeWeightSummary([entry('2026-11-16', 785)], today)).toEqual({
      weight: '78,5 kg',
      day: 'ontem',
      difference: null,
      loggedToday: false,
    })
  })
})
