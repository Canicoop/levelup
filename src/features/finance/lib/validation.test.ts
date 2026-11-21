import { describe, expect, it } from 'vitest'
import {
  validateBudgetAmount,
  validateCategoryName,
  validateSubscription,
  validateTransaction,
  type SubscriptionInput,
  type TransactionInput,
} from '@/features/finance/lib/validation'

const today = '2026-11-21'

const validTransaction: TransactionInput = {
  kind: 'expense',
  categoryId: 'food',
  amount: '12,50',
  day: today,
  merchant: '  Pingo   Doce ',
  note: '  Jantar\ncom amigos  ',
}

describe('validateTransaction', () => {
  it('returns the values to save: cents, the merchant cleaned and the note trimmed at the ends', () => {
    expect(validateTransaction(validTransaction, today)).toEqual({
      ok: true,
      value: {
        kind: 'expense',
        categoryId: 'food',
        cents: 1250,
        day: today,
        merchant: 'Pingo Doce',
        note: 'Jantar\ncom amigos',
      },
    })
  })

  it('turns an empty merchant or note into null', () => {
    const result = validateTransaction({ ...validTransaction, merchant: '   ', note: '\n ' }, today)
    expect(result.ok && result.value.merchant).toBeNull()
    expect(result.ok && result.value.note).toBeNull()
  })

  it('accepts an earlier day', () => {
    expect(validateTransaction({ ...validTransaction, day: '2026-10-31' }, today).ok).toBe(true)
  })

  it('gives one error per field, all at once', () => {
    expect(
      validateTransaction(
        { kind: 'income', categoryId: null, amount: '', day: '2026-11-22', merchant: 'x'.repeat(81), note: 'x'.repeat(201) },
        today,
      ),
    ).toEqual({
      ok: false,
      errors: {
        amount: 'Escreve o valor.',
        categoryId: 'Escolhe uma categoria.',
        day: 'A data não pode ser depois de hoje.',
        merchant: 'A loja pode ter até 80 caracteres.',
        note: 'A nota pode ter até 200 caracteres.',
      },
    })
  })

  it('uses the amount\'s own messages', () => {
    expect(validateTransaction({ ...validTransaction, amount: '1.500' }, today)).toEqual({
      ok: false,
      errors: { amount: 'Usa no máximo duas casas decimais.' },
    })
  })

  it.each(['', '2026-02-30', '21/11/2026'])('asks for a date when it is %j', (day) => {
    expect(validateTransaction({ ...validTransaction, day }, today)).toEqual({
      ok: false,
      errors: { day: 'Escolhe a data.' },
    })
  })

  it('accepts a merchant of 80 characters and a note of 200, counting an emoji as one', () => {
    const result = validateTransaction({ ...validTransaction, merchant: '\u{1F6D2}'.repeat(80), note: 'x'.repeat(200) }, today)
    expect(result.ok).toBe(true)
  })
})

const validSubscription: SubscriptionInput = {
  name: '  Spotify  Família ',
  amount: '17,99',
  intervalMonths: 1,
  referenceDate: '2026-10-31',
  categoryId: 'fun',
}

describe('validateSubscription', () => {
  it('returns the values to save, with the name cleaned', () => {
    expect(validateSubscription(validSubscription)).toEqual({
      ok: true,
      value: { name: 'Spotify Família', cents: 1799, intervalMonths: 1, referenceDate: '2026-10-31', categoryId: 'fun' },
    })
  })

  it('accepts a reference date in the future', () => {
    expect(validateSubscription({ ...validSubscription, referenceDate: '2027-03-15' }).ok).toBe(true)
  })

  it.each([3, 6, 12])('accepts every %i months', (intervalMonths) => {
    expect(validateSubscription({ ...validSubscription, intervalMonths }).ok).toBe(true)
  })

  it('gives one error per field, all at once', () => {
    expect(
      validateSubscription({ name: '   ', amount: '0', intervalMonths: 2, referenceDate: '', categoryId: null }),
    ).toEqual({
      ok: false,
      errors: {
        name: 'Escreve um nome.',
        amount: 'O valor vai de 0,01 € a 99 999,99 €.',
        intervalMonths: 'Escolhe a periodicidade.',
        referenceDate: 'Escolhe a data de um pagamento.',
        categoryId: 'Escolhe uma categoria.',
      },
    })
  })

  it('refuses a name over 80 characters, and no period at all', () => {
    expect(validateSubscription({ ...validSubscription, name: 'x'.repeat(81), intervalMonths: null })).toEqual({
      ok: false,
      errors: { name: 'O nome pode ter até 80 caracteres.', intervalMonths: 'Escolhe a periodicidade.' },
    })
  })
})

describe('validateCategoryName', () => {
  it('returns the name cleaned', () => {
    expect(validateCategoryName('  Casa   e jardim ')).toEqual({ ok: true, value: 'Casa e jardim' })
  })

  it('accepts 40 characters and refuses 41', () => {
    expect(validateCategoryName('x'.repeat(40))).toEqual({ ok: true, value: 'x'.repeat(40) })
    expect(validateCategoryName('x'.repeat(41))).toEqual({ ok: false, error: 'O nome pode ter até 40 caracteres.' })
  })

  it('refuses an empty name', () => {
    expect(validateCategoryName('   ')).toEqual({ ok: false, error: 'Escreve um nome.' })
  })
})

describe('validateBudgetAmount', () => {
  it('reads the amount with the same rules as a transaction', () => {
    expect(validateBudgetAmount('300')).toEqual({ ok: true, value: 30000 })
    expect(validateBudgetAmount('1 200,50 €')).toEqual({ ok: true, value: 120050 })
  })

  it('refuses an empty field: removing a budget is an action of its own', () => {
    expect(validateBudgetAmount('')).toEqual({ ok: false, error: 'Escreve o valor.' })
  })
})
