import { describe, expect, it } from 'vitest'
import {
  formatEmptyMonth,
  formatMonthTitle,
  formatSignedAmount,
  formatTransactionDay,
  groupByDay,
  kindLabel,
} from '@/features/finance/lib/labels'
import type { Transaction } from '@/features/finance/lib/totals'

const NBSP = '\u00A0'
const MINUS = '\u2212'

describe('kindLabel', () => {
  it('names each kind in European Portuguese', () => {
    expect(kindLabel('expense')).toBe('Despesa')
    expect(kindLabel('income')).toBe('Receita')
  })
})

describe('formatMonthTitle', () => {
  it.each([
    ['2026-11', 'Novembro 2026'],
    ['2027-01', 'Janeiro 2027'],
    ['2026-03', 'Março 2026'],
  ])('titles %j as %j, without "de"', (month, title) => {
    expect(formatMonthTitle(month)).toBe(title)
  })
})

describe('formatTransactionDay', () => {
  const today = '2026-11-21'

  it('says "Hoje" and "Ontem"', () => {
    expect(formatTransactionDay('2026-11-21', today)).toBe('Hoje')
    expect(formatTransactionDay('2026-11-20', today)).toBe('Ontem')
  })

  it('uses the weekday, capitalised, from two to six days ago', () => {
    expect(formatTransactionDay('2026-11-19', today)).toBe('Quinta-feira')
    expect(formatTransactionDay('2026-11-15', today)).toBe('Domingo')
  })

  it('uses the date from seven days ago, with the year only in another year', () => {
    expect(formatTransactionDay('2026-11-14', today)).toBe('14 de novembro')
    expect(formatTransactionDay('2026-11-01', today)).toBe('1 de novembro')
    expect(formatTransactionDay('2025-12-31', '2026-01-02')).toBe('Quarta-feira')
    expect(formatTransactionDay('2025-12-20', '2026-01-02')).toBe('20 de dezembro de 2025')
  })

  it('counts calendar days across a clock change', () => {
    expect(formatTransactionDay('2026-10-24', '2026-10-25')).toBe('Ontem')
    expect(formatTransactionDay('2026-10-25', '2026-10-26')).toBe('Ontem')
  })
})

function transaction(id: string, day: string, changes: Partial<Transaction> = {}): Transaction {
  return {
    id,
    kind: 'expense',
    categoryId: 'food',
    cents: 1000,
    day,
    createdAt: `${day}T12:00:00.000000+00:00`,
    merchant: null,
    note: null,
    ...changes,
  }
}

describe('groupByDay', () => {
  it('groups the transactions of each day, keeping the order given', () => {
    const list = [
      transaction('a', '2026-11-21'),
      transaction('b', '2026-11-21'),
      transaction('c', '2026-11-19'),
      transaction('d', '2026-11-02'),
      transaction('e', '2026-11-02'),
    ]
    expect(groupByDay(list).map((group) => [group.day, group.transactions.map((item) => item.id)])).toEqual([
      ['2026-11-21', ['a', 'b']],
      ['2026-11-19', ['c']],
      ['2026-11-02', ['d', 'e']],
    ])
  })

  it('is empty without transactions', () => {
    expect(groupByDay([])).toEqual([])
  })
})

describe('formatSignedAmount', () => {
  it('writes an expense with a minus sign (U+2212) and income with a plus sign', () => {
    expect(formatSignedAmount({ kind: 'expense', cents: 1250 })).toBe(`${MINUS}12,50${NBSP}€`)
    expect(formatSignedAmount({ kind: 'income', cents: 150000 })).toBe(`+1500,00${NBSP}€`)
  })

  it('groups the thousands from five digits', () => {
    expect(formatSignedAmount({ kind: 'expense', cents: 1234567 })).toBe(`${MINUS}12${NBSP}345,67${NBSP}€`)
  })
})

describe('formatEmptyMonth', () => {
  it('adds the hint only in the current month', () => {
    expect(formatEmptyMonth('2026-11', '2026-11')).toEqual({
      title: 'Sem movimentos em novembro.',
      hint: 'Regista a primeira despesa ou receita do mês.',
    })
    expect(formatEmptyMonth('2026-10', '2026-11')).toEqual({ title: 'Sem movimentos em outubro.', hint: null })
  })
})
