import { describe, expect, it } from 'vitest'
import type { Category } from '@/features/finance/lib/categories'
import { monthTotals, sortTransactions, spendingByCategory, type Transaction } from '@/features/finance/lib/totals'

let nextId = 0

function transaction(changes: Partial<Transaction>): Transaction {
  nextId += 1
  return {
    id: `t${String(nextId).padStart(3, '0')}`,
    kind: 'expense',
    categoryId: 'food',
    cents: 1000,
    day: '2026-11-10',
    createdAt: '2026-11-10T12:00:00.000000+00:00',
    merchant: null,
    note: null,
    ...changes,
  }
}

const food: Category = { id: 'food', kind: 'expense', name: 'Alimentação', archivedAt: null }
const home: Category = { id: 'home', kind: 'expense', name: 'Casa', archivedAt: null }
const fun: Category = { id: 'fun', kind: 'expense', name: 'Lazer', archivedAt: '2026-11-01T10:00:00Z' }
const others: Category = { id: 'others', kind: 'expense', name: 'Outros', archivedAt: null }
const salary: Category = { id: 'salary', kind: 'income', name: 'Salário', archivedAt: null }
const categories = [food, home, fun, others, salary]

describe('monthTotals', () => {
  it('is all zeros without transactions', () => {
    expect(monthTotals([])).toEqual({ income: 0, expenses: 0, balance: 0 })
  })

  it('adds what came in and what went out, and their difference', () => {
    const totals = monthTotals([
      transaction({ kind: 'income', categoryId: 'salary', cents: 150000 }),
      transaction({ cents: 1250 }),
      transaction({ cents: 890 }),
    ])
    expect(totals).toEqual({ income: 150000, expenses: 2140, balance: 147860 })
  })

  it('gives a negative balance when more went out', () => {
    expect(monthTotals([transaction({ cents: 5000 })])).toEqual({ income: 0, expenses: 5000, balance: -5000 })
  })

  it('stays exact over many small amounts', () => {
    const many = Array.from({ length: 1000 }, () => transaction({ cents: 1 }))
    expect(monthTotals(many).expenses).toBe(1000)
  })
})

describe('spendingByCategory', () => {
  it('counts expenses only, the largest first', () => {
    const result = spendingByCategory(
      [
        transaction({ categoryId: 'food', cents: 1000 }),
        transaction({ categoryId: 'home', cents: 65000 }),
        transaction({ categoryId: 'food', cents: 2500 }),
        transaction({ kind: 'income', categoryId: 'salary', cents: 150000 }),
      ],
      categories,
    )
    expect(result).toEqual([
      { categoryId: 'home', category: home, cents: 65000 },
      { categoryId: 'food', category: food, cents: 3500 },
    ])
  })

  it('orders equal amounts by name, with "Outros" last', () => {
    const result = spendingByCategory(
      [
        transaction({ categoryId: 'others', cents: 1000 }),
        transaction({ categoryId: 'home', cents: 1000 }),
        transaction({ categoryId: 'food', cents: 1000 }),
      ],
      categories,
    )
    expect(result.map((row) => row.category?.name)).toEqual(['Alimentação', 'Casa', 'Outros'])
  })

  it('includes archived categories, which old transactions still use', () => {
    const result = spendingByCategory([transaction({ categoryId: 'fun', cents: 2000 })], categories)
    expect(result).toEqual([{ categoryId: 'fun', category: fun, cents: 2000 }])
  })

  it('keeps the spending of a category not read yet, after the named ones', () => {
    const result = spendingByCategory(
      [transaction({ categoryId: 'unknown', cents: 1000 }), transaction({ categoryId: 'food', cents: 1000 })],
      categories,
    )
    expect(result).toEqual([
      { categoryId: 'food', category: food, cents: 1000 },
      { categoryId: 'unknown', category: null, cents: 1000 },
    ])
  })

  it('is empty without expenses', () => {
    expect(spendingByCategory([], categories)).toEqual([])
    expect(spendingByCategory([transaction({ kind: 'income', categoryId: 'salary' })], categories)).toEqual([])
  })
})

describe('sortTransactions', () => {
  it('puts the newest day first', () => {
    const older = transaction({ day: '2026-11-09' })
    const newer = transaction({ day: '2026-11-12' })
    expect(sortTransactions([older, newer])).toEqual([newer, older])
  })

  it('puts the most recently logged first within a day', () => {
    const first = transaction({ createdAt: '2026-11-10T09:00:00.000000+00:00' })
    const second = transaction({ createdAt: '2026-11-10T18:30:00.000000+00:00' })
    expect(sortTransactions([first, second])).toEqual([second, first])
  })

  it('breaks a full tie by id, the highest first', () => {
    const a = transaction({ id: 'a' })
    const b = transaction({ id: 'b' })
    expect(sortTransactions([a, b])).toEqual([b, a])
  })

  it('returns a new array and leaves the one given as it was', () => {
    const older = transaction({ day: '2026-11-09' })
    const newer = transaction({ day: '2026-11-12' })
    const given = [older, newer]
    sortTransactions(given)
    expect(given).toEqual([older, newer])
  })
})
