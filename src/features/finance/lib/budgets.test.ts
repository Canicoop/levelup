import { describe, expect, it } from 'vitest'
import { budgetInForce, budgetProgress, budgetsInForce, type BudgetRow } from '@/features/finance/lib/budgets'

const rows: BudgetRow[] = [
  { categoryId: null, month: '2026-09', cents: 150000 },
  { categoryId: null, month: '2026-11', cents: 120000 },
  { categoryId: 'food', month: '2026-09', cents: 30000 },
  { categoryId: 'food', month: '2026-11', cents: null },
  { categoryId: 'home', month: '2026-12', cents: 70000 },
]

describe('budgetInForce', () => {
  it('is null without rows', () => {
    expect(budgetInForce([], null, '2026-11')).toBeNull()
  })

  it('applies a row from an earlier month', () => {
    expect(budgetInForce(rows, null, '2026-10')).toBe(150000)
  })

  it('takes the latest row starting in the month or before', () => {
    expect(budgetInForce(rows, null, '2026-11')).toBe(120000)
    expect(budgetInForce(rows, null, '2027-03')).toBe(120000)
  })

  it('ignores rows that start after the month', () => {
    expect(budgetInForce(rows, null, '2026-08')).toBeNull()
    expect(budgetInForce(rows, 'home', '2026-11')).toBeNull()
    expect(budgetInForce(rows, 'home', '2026-12')).toBe(70000)
  })

  it('removes a budget from the month of a row with no amount, and keeps it before', () => {
    expect(budgetInForce(rows, 'food', '2026-10')).toBe(30000)
    expect(budgetInForce(rows, 'food', '2026-11')).toBeNull()
    expect(budgetInForce(rows, 'food', '2027-01')).toBeNull()
  })

  it('never mixes the overall budget with a category', () => {
    const onlyCategory: BudgetRow[] = [{ categoryId: 'food', month: '2026-09', cents: 30000 }]
    const onlyOverall: BudgetRow[] = [{ categoryId: null, month: '2026-09', cents: 150000 }]
    expect(budgetInForce(onlyCategory, null, '2026-11')).toBeNull()
    expect(budgetInForce(onlyOverall, 'food', '2026-11')).toBeNull()
  })

  it('does not depend on the order of the rows', () => {
    const reversed = [...rows].reverse()
    for (const month of ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12']) {
      for (const categoryId of [null, 'food', 'home']) {
        expect(budgetInForce(reversed, categoryId, month)).toBe(budgetInForce(rows, categoryId, month))
      }
    }
  })
})

describe('budgetsInForce', () => {
  it('lists the overall budget and the categories in force, without the removed ones', () => {
    const november = budgetsInForce(rows, '2026-11')
    expect(november.overall).toBe(120000)
    expect([...november.byCategory]).toEqual([])

    const october = budgetsInForce(rows, '2026-10')
    expect(october.overall).toBe(150000)
    expect([...october.byCategory]).toEqual([['food', 30000]])

    const december = budgetsInForce(rows, '2026-12')
    expect([...december.byCategory]).toEqual([['home', 70000]])
  })

  it('has no overall budget when none was set', () => {
    expect(budgetsInForce([{ categoryId: 'food', month: '2026-09', cents: 30000 }], '2026-11').overall).toBeNull()
  })
})

describe('budgetProgress', () => {
  it('shows what is left under the budget', () => {
    expect(budgetProgress(30000, 12000)).toEqual({ budget: 30000, spent: 12000, remaining: 18000, over: 0, filled: 0.4 })
  })

  it('has nothing left and nothing over at exactly the budget', () => {
    expect(budgetProgress(30000, 30000)).toEqual({ budget: 30000, spent: 30000, remaining: 0, over: 0, filled: 1 })
  })

  it('shows how far over, with the bar full', () => {
    expect(budgetProgress(30000, 41050)).toEqual({ budget: 30000, spent: 41050, remaining: 0, over: 11050, filled: 1 })
  })

  it('is empty with no spending', () => {
    expect(budgetProgress(30000, 0)).toEqual({ budget: 30000, spent: 0, remaining: 30000, over: 0, filled: 0 })
  })
})
