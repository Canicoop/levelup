import { describe, expect, it } from 'vitest'
import {
  toBudgetRow,
  toCategory,
  toSubscription,
  toTransaction,
  type DbCategory,
  type DbSubscription,
  type DbTransaction,
} from '@/features/finance/lib/rows'

describe('toCategory', () => {
  const row: DbCategory = { id: 'c1', kind: 'expense', name: 'Alimentação', archived_at: null }

  it('keeps the fields under the app\'s names', () => {
    expect(toCategory(row)).toEqual({ id: 'c1', kind: 'expense', name: 'Alimentação', archivedAt: null })
    expect(toCategory({ ...row, kind: 'income', archived_at: '2026-11-01T10:00:00+00:00' })).toEqual({
      id: 'c1',
      kind: 'income',
      name: 'Alimentação',
      archivedAt: '2026-11-01T10:00:00+00:00',
    })
  })

  it('throws for a kind the database never allows', () => {
    expect(() => toCategory({ ...row, kind: 'transfer' })).toThrow('Unexpected kind from the database')
  })
})

describe('toTransaction', () => {
  const row: DbTransaction = {
    id: 't1',
    kind: 'expense',
    category_id: 'c1',
    amount: '12.50',
    occurred_on: '2026-11-20',
    merchant: 'Pingo Doce',
    note: null,
    created_at: '2026-11-21T03:41:23.840764+00:00',
  }

  it('turns the amount text into cents and keeps the rest', () => {
    expect(toTransaction(row)).toEqual({
      id: 't1',
      kind: 'expense',
      categoryId: 'c1',
      cents: 1250,
      day: '2026-11-20',
      createdAt: '2026-11-21T03:41:23.840764+00:00',
      merchant: 'Pingo Doce',
      note: null,
    })
  })

  it('throws for an amount that is not numeric(12, 2) text, or an unknown kind', () => {
    expect(() => toTransaction({ ...row, amount: '12.5' })).toThrow('Unexpected amount from the database')
    expect(() => toTransaction({ ...row, kind: 'transfer' })).toThrow('Unexpected kind from the database')
  })
})

describe('toBudgetRow', () => {
  it('turns starts_on into its month and the amount into cents', () => {
    expect(toBudgetRow({ id: 'b1', category_id: 'c1', starts_on: '2026-11-01', amount: '300.00' })).toEqual({
      categoryId: 'c1',
      month: '2026-11',
      cents: 30000,
    })
  })

  it('keeps the overall budget (no category) and "no budget" (no amount) as null', () => {
    expect(toBudgetRow({ id: 'b2', category_id: null, starts_on: '2026-11-01', amount: null })).toEqual({
      categoryId: null,
      month: '2026-11',
      cents: null,
    })
  })
})

describe('toSubscription', () => {
  const row: DbSubscription = {
    id: 's1',
    name: 'Spotify',
    amount: '10.99',
    interval_months: 3,
    reference_date: '2026-10-31',
    category_id: 'c1',
    archived_at: null,
  }

  it('turns the amount text into cents and keeps the rest', () => {
    expect(toSubscription(row)).toEqual({
      id: 's1',
      name: 'Spotify',
      cents: 1099,
      intervalMonths: 3,
      referenceDate: '2026-10-31',
      categoryId: 'c1',
      archivedAt: null,
    })
  })

  it('throws for a period the database never allows', () => {
    expect(() => toSubscription({ ...row, interval_months: 2 })).toThrow('Unexpected interval from the database')
  })
})
