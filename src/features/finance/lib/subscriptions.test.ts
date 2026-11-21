import { describe, expect, it } from 'vitest'
import {
  monthlyCost,
  monthlyTotal,
  nextPayment,
  upcomingPayments,
  type Subscription,
} from '@/features/finance/lib/subscriptions'

describe('nextPayment', () => {
  it('keeps the reference day: 31 January, 28 February, 31 March', () => {
    expect(nextPayment('2026-01-31', 1, '2026-02-01')).toBe('2026-02-28')
    expect(nextPayment('2026-01-31', 1, '2026-03-01')).toBe('2026-03-31')
    expect(nextPayment('2026-01-31', 1, '2026-04-01')).toBe('2026-04-30')
    expect(nextPayment('2026-01-31', 1, '2026-05-01')).toBe('2026-05-31')
  })

  it('comes back to 29 February in leap years', () => {
    expect(nextPayment('2024-02-29', 12, '2025-01-10')).toBe('2025-02-28')
    expect(nextPayment('2024-02-29', 12, '2027-03-01')).toBe('2028-02-29')
  })

  it('is today when the payment is today', () => {
    expect(nextPayment('2026-01-31', 1, '2026-03-31')).toBe('2026-03-31')
    expect(nextPayment('2024-02-29', 12, '2028-02-29')).toBe('2028-02-29')
  })

  it('moves to the next period when this month\'s payment has passed', () => {
    expect(nextPayment('2026-01-15', 1, '2026-11-21')).toBe('2026-12-15')
    expect(nextPayment('2026-01-25', 1, '2026-11-21')).toBe('2026-11-25')
  })

  it('counts every 3, 6 and 12 months from the reference', () => {
    expect(nextPayment('2026-01-10', 3, '2026-11-21')).toBe('2027-01-10')
    expect(nextPayment('2026-02-10', 6, '2026-11-21')).toBe('2027-02-10')
    expect(nextPayment('2026-03-10', 12, '2026-11-21')).toBe('2027-03-10')
    expect(nextPayment('2026-05-30', 6, '2026-11-21')).toBe('2026-11-30')
  })

  it('crosses the new year', () => {
    expect(nextPayment('2026-10-31', 3, '2026-11-21')).toBe('2027-01-31')
    expect(nextPayment('2026-12-31', 1, '2026-12-31')).toBe('2026-12-31')
    expect(nextPayment('2026-12-31', 1, '2027-01-01')).toBe('2027-01-31')
  })

  it('works from a reference years back, in one step (2015)', () => {
    expect(nextPayment('2015-01-31', 1, '2026-11-21')).toBe('2026-11-30')
    expect(nextPayment('2015-03-31', 3, '2026-11-21')).toBe('2026-12-31')
    expect(nextPayment('2015-08-15', 12, '2026-11-21')).toBe('2027-08-15')
    expect(nextPayment('2016-02-29', 12, '2026-11-21')).toBe('2027-02-28')
  })

  it('can be before a reference in the future, when that payment is still to come', () => {
    expect(nextPayment('2026-12-15', 3, '2026-11-21')).toBe('2026-12-15')
    expect(nextPayment('2027-01-15', 3, '2026-11-21')).toBe('2027-01-15')
    expect(nextPayment('2027-06-01', 1, '2026-11-21')).toBe('2026-12-01')
  })
})

describe('monthlyCost', () => {
  it.each([
    [1000, 1, 1000],
    [1000, 3, 333],
    [2000, 3, 667],
    [999, 6, 167],
    [1, 2, 1],
    [5999, 12, 500],
    [12000, 12, 1000],
  ])('%i cents every %i months is %i a month (half a cent rounded up)', (cents, months, expected) => {
    expect(monthlyCost(cents, months)).toBe(expected)
  })
})

function subscription(changes: Partial<Subscription>): Subscription {
  return {
    id: 's1',
    name: 'Spotify',
    cents: 1099,
    intervalMonths: 1,
    referenceDate: '2026-10-05',
    categoryId: 'fun',
    archivedAt: null,
    ...changes,
  }
}

describe('monthlyTotal', () => {
  it('adds the rounded costs: two quarterly 10,00 € are 6,66 €, not 6,67 €', () => {
    const list = [
      subscription({ id: 'a', cents: 1000, intervalMonths: 3 }),
      subscription({ id: 'b', cents: 1000, intervalMonths: 3 }),
    ]
    expect(monthlyTotal(list)).toBe(666)
  })

  it('only counts active subscriptions', () => {
    const list = [
      subscription({ id: 'a', cents: 1099 }),
      subscription({ id: 'b', cents: 4500, intervalMonths: 12, archivedAt: '2026-11-01T10:00:00Z' }),
    ]
    expect(monthlyTotal(list)).toBe(1099)
  })

  it('is 0 without subscriptions', () => {
    expect(monthlyTotal([])).toBe(0)
  })
})

describe('upcomingPayments', () => {
  it('gives the next payment of each active subscription, by date and then by name', () => {
    const internet = subscription({ id: 'a', name: 'Internet', referenceDate: '2026-10-25' })
    const spotify = subscription({ id: 'b', name: 'Spotify', referenceDate: '2026-10-25' })
    const gym = subscription({ id: 'c', name: 'Ginásio', referenceDate: '2026-11-22' })
    const magazine = subscription({ id: 'd', name: 'Revista', intervalMonths: 12, referenceDate: '2026-11-01' })
    const cancelled = subscription({ id: 'e', name: 'Netflix', archivedAt: '2026-11-01T10:00:00Z' })

    const result = upcomingPayments([spotify, magazine, cancelled, internet, gym], '2026-11-21')
    expect(result.map(({ subscription: item, date }) => [item.name, date])).toEqual([
      ['Ginásio', '2026-11-22'],
      ['Internet', '2026-11-25'],
      ['Spotify', '2026-11-25'],
      // No limit of days: a yearly payment almost a year away still shows.
      ['Revista', '2027-11-01'],
    ])
  })
})
