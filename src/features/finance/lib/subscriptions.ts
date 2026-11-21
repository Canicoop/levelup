import type { Cents } from '@/features/finance/lib/money'
import { shiftMonths, type DayKey } from '@/lib/lisbon-day'

export const INTERVAL_MONTHS = [1, 3, 6, 12] as const
export type IntervalMonths = (typeof INTERVAL_MONTHS)[number]

// Version A (see docs/decisions.md, Finance module): a list, never turned into
// transactions. The next payment is calculated, never stored.
export type Subscription = {
  id: string
  name: string
  cents: Cents
  intervalMonths: IntervalMonths
  referenceDate: DayKey
  categoryId: string
  archivedAt: string | null
}

function monthIndex(day: DayKey) {
  const [year, month] = day.split('-').map(Number)
  return year * 12 + (month - 1)
}

// The first payment on or after today: a whole number of periods before or
// after the reference date, which may itself be in the future. Every date is
// shifted from the reference, never from the previous date, so the reference
// day comes back in the months that have it (31 January, 28 February,
// 31 March), and 29 February in leap years.
//
// The number of periods comes from the months between the two dates: the
// latest payment in today's month or before, then one period more if that one
// is before today. One correction is enough, since the next period always
// falls in a later month than today's.
export function nextPayment(referenceDate: DayKey, intervalMonths: number, today: DayKey): DayKey {
  const periods = Math.floor((monthIndex(today) - monthIndex(referenceDate)) / intervalMonths)
  const latest = shiftMonths(referenceDate, periods * intervalMonths)
  return latest >= today ? latest : shiftMonths(referenceDate, (periods + 1) * intervalMonths)
}

// The monthly cost of one subscription, rounded to the cent with half a cent
// rounded up: floor((2c + n) / 2n), by integer arithmetic.
export function monthlyCost(cents: Cents, intervalMonths: number): Cents {
  const numerator = 2 * cents + intervalMonths
  const denominator = 2 * intervalMonths
  return (numerator - (numerator % denominator)) / denominator
}

// The sum of the active subscriptions' rounded monthly costs: two quarterly
// subscriptions of 10,00 € are 3,33 € + 3,33 € = 6,66 €.
export function monthlyTotal(subscriptions: Subscription[]): Cents {
  return subscriptions
    .filter((subscription) => subscription.archivedAt === null)
    .reduce((total, subscription) => total + monthlyCost(subscription.cents, subscription.intervalMonths), 0)
}

const nameCollator = new Intl.Collator('pt-PT')

// The next payment of every active subscription, with no limit of days, by date
// and then by name.
export function upcomingPayments(subscriptions: Subscription[], today: DayKey): { subscription: Subscription; date: DayKey }[] {
  return subscriptions
    .filter((subscription) => subscription.archivedAt === null)
    .map((subscription) => ({
      subscription,
      date: nextPayment(subscription.referenceDate, subscription.intervalMonths, today),
    }))
    .sort(
      (a, b) =>
        (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) ||
        nameCollator.compare(a.subscription.name, b.subscription.name) ||
        (a.subscription.id < b.subscription.id ? -1 : a.subscription.id > b.subscription.id ? 1 : 0),
    )
}
