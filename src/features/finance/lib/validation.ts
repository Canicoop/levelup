import type { Kind } from '@/features/finance/lib/categories'
import { parseAmountInput, type Cents, type Parsed } from '@/features/finance/lib/money'
import { INTERVAL_MONTHS, type IntervalMonths } from '@/features/finance/lib/subscriptions'
import { shiftDays, type DayKey } from '@/lib/lisbon-day'
import { characterCount, cleanName } from '@/lib/text'

// The forms' rules, the same as the finance tables' checks (see docs/decisions.md,
// Finance tables). Forms with several fields get one error per field, shown
// next to that field; the messages are in European Portuguese.
export type Validated<T, F extends string> = { ok: true; value: T } | { ok: false; errors: Partial<Record<F, string>> }

const MERCHANT_MAX = 80
const NOTE_MAX = 200
const SUBSCRIPTION_NAME_MAX = 80
const CATEGORY_NAME_MAX = 40

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// A real calendar day as "2026-11-19": "2026-02-30" has the shape but is not one.
function isDay(text: string) {
  return DAY_PATTERN.test(text) && shiftDays(text, 0) === text
}

function nameError(name: string, max: number) {
  const length = characterCount(name)
  if (length === 0) return 'Escreve um nome.'
  if (length > max) return `O nome pode ter até ${max} caracteres.`
  return null
}

export type TransactionInput = {
  kind: Kind
  categoryId: string | null
  amount: string
  day: string
  merchant: string
  note: string
}

export type TransactionValues = {
  kind: Kind
  categoryId: string
  cents: Cents
  day: DayKey
  merchant: string | null
  note: string | null
}

type TransactionField = 'amount' | 'categoryId' | 'day' | 'merchant' | 'note'

// A transaction's form. The merchant is cleaned like a name (ends trimmed,
// inner runs of spaces made one); the note is only trimmed at the ends, so its
// lines stay. Either one empty becomes null. No day after Lisbon's today.
export function validateTransaction(input: TransactionInput, today: DayKey): Validated<TransactionValues, TransactionField> {
  const errors: Partial<Record<TransactionField, string>> = {}

  const amount = parseAmountInput(input.amount)
  if (!amount.ok) errors.amount = amount.error

  if (!input.categoryId) errors.categoryId = 'Escolhe uma categoria.'

  if (!isDay(input.day)) errors.day = 'Escolhe a data.'
  else if (input.day > today) errors.day = 'A data não pode ser depois de hoje.'

  const merchant = cleanName(input.merchant)
  if (characterCount(merchant) > MERCHANT_MAX) errors.merchant = `A loja pode ter até ${MERCHANT_MAX} caracteres.`

  const note = input.note.trim()
  if (characterCount(note) > NOTE_MAX) errors.note = `A nota pode ter até ${NOTE_MAX} caracteres.`

  if (!amount.ok || !input.categoryId || Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: {
      kind: input.kind,
      categoryId: input.categoryId,
      cents: amount.value,
      day: input.day,
      merchant: merchant === '' ? null : merchant,
      note: note === '' ? null : note,
    },
  }
}

export type SubscriptionInput = {
  name: string
  amount: string
  intervalMonths: number | null
  referenceDate: string
  categoryId: string | null
}

export type SubscriptionValues = {
  name: string
  cents: Cents
  intervalMonths: IntervalMonths
  referenceDate: DayKey
  categoryId: string
}

type SubscriptionField = 'name' | 'amount' | 'intervalMonths' | 'referenceDate' | 'categoryId'

function isIntervalMonths(value: number | null): value is IntervalMonths {
  return INTERVAL_MONTHS.some((months) => months === value)
}

// A subscription's form: a name of 1 to 80 characters, the amount with the
// same rules as a transaction, every 1, 3, 6 or 12 months, the date of one
// payment (any day, past or future) and an expense category.
export function validateSubscription(input: SubscriptionInput): Validated<SubscriptionValues, SubscriptionField> {
  const errors: Partial<Record<SubscriptionField, string>> = {}

  const name = cleanName(input.name)
  const nameProblem = nameError(name, SUBSCRIPTION_NAME_MAX)
  if (nameProblem) errors.name = nameProblem

  const amount = parseAmountInput(input.amount)
  if (!amount.ok) errors.amount = amount.error

  const intervalMonths = input.intervalMonths
  if (!isIntervalMonths(intervalMonths)) errors.intervalMonths = 'Escolhe a periodicidade.'

  if (!isDay(input.referenceDate)) errors.referenceDate = 'Escolhe a data de um pagamento.'

  if (!input.categoryId) errors.categoryId = 'Escolhe uma categoria.'

  if (!amount.ok || !isIntervalMonths(intervalMonths) || !input.categoryId || Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }
  return {
    ok: true,
    value: {
      name,
      cents: amount.value,
      intervalMonths,
      referenceDate: input.referenceDate,
      categoryId: input.categoryId,
    },
  }
}

// A category's name, cleaned: 1 to 40 characters. Whether it is taken is
// decided by resolveNewCategory and isCategoryNameTaken (categories.ts).
export function validateCategoryName(raw: string): Parsed<string> {
  const name = cleanName(raw)
  const problem = nameError(name, CATEGORY_NAME_MAX)
  return problem ? { ok: false, error: problem } : { ok: true, value: name }
}

// A budget's amount, with the same rules as a transaction. Removing a budget is
// an action of its own, not an empty field.
export function validateBudgetAmount(raw: string): Parsed<Cents> {
  return parseAmountInput(raw)
}
