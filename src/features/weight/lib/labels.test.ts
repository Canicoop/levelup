import { describe, expect, it } from 'vitest'
import type { WeightEntry } from '@/features/weight/lib/entries'
import { formatDeleteQuestion, formatEntryDay, homeWeightSummary } from '@/features/weight/lib/labels'

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
