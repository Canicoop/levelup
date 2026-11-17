import { describe, expect, it } from 'vitest'
import {
  canEdit,
  dayChanged,
  historyRows,
  todayEntry,
  toWeightEntry,
  type WeightEntry,
} from '@/features/weight/lib/entries'

const entry = (day: string, tenths: number): WeightEntry => ({ id: day, day, tenths })

describe('toWeightEntry', () => {
  it('turns a database row into an entry in tenths', () => {
    expect(toWeightEntry({ id: 'x', entry_date: '2026-11-17', weight_kg: 78.4 })).toEqual({
      id: 'x',
      day: '2026-11-17',
      tenths: 784,
    })
  })
})

describe('historyRows', () => {
  it('is empty without entries', () => {
    expect(historyRows([])).toEqual([])
  })

  it('has no difference for a single entry', () => {
    expect(historyRows([entry('2026-11-17', 784)])).toEqual([{ entry: entry('2026-11-17', 784), difference: null }])
  })

  it('is newest first, each compared with the entry before it, across missing days', () => {
    const rows = historyRows([entry('2026-11-10', 790), entry('2026-11-17', 784), entry('2026-11-12', 789)])
    expect(rows.map((row) => [row.entry.day, row.difference])).toEqual([
      ['2026-11-17', -5],
      ['2026-11-12', -1],
      ['2026-11-10', null],
    ])
  })
})

describe('todayEntry and canEdit', () => {
  const entries = [entry('2026-11-16', 790), entry('2026-11-17', 784)]

  it('finds today\'s entry, which is the only editable one', () => {
    expect(todayEntry(entries, '2026-11-17')).toEqual(entry('2026-11-17', 784))
    expect(canEdit(entry('2026-11-17', 784), '2026-11-17')).toBe(true)
    expect(canEdit(entry('2026-11-16', 790), '2026-11-17')).toBe(false)
  })

  it('is null without an entry today', () => {
    expect(todayEntry(entries, '2026-11-18')).toBeNull()
  })
})

describe('dayChanged', () => {
  it('is false until midnight in Lisbon, and true from it (winter)', () => {
    expect(dayChanged('2026-11-16', new Date('2026-11-16T23:59:59Z'))).toBe(false)
    expect(dayChanged('2026-11-16', new Date('2026-11-17T00:00:00Z'))).toBe(true)
  })

  it('changes at 23:00 UTC in summer', () => {
    expect(dayChanged('2026-07-01', new Date('2026-07-01T22:59:59Z'))).toBe(false)
    expect(dayChanged('2026-07-01', new Date('2026-07-01T23:00:00Z'))).toBe(true)
  })
})
