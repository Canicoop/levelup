import { describe, expect, it } from 'vitest'
import {
  CategoryUnavailableError,
  DuplicateCategoryError,
  FutureDayError,
  categoryWriteError,
  financeErrorMessage,
  hasCode,
  transactionWriteError,
} from '@/features/finance/lib/errors'
import { NotFoundError, ValidationError } from '@/lib/errors'

// Errors shaped like the Data API's (PostgrestError): a code and a message.
const policyViolation = {
  code: '42501',
  message: 'new row violates row-level security policy for table "transactions"',
}
const permissionDenied = { code: '42501', message: 'permission denied for table transactions' }
const foreignKeyViolation = {
  code: '23503',
  message: 'insert or update on table "transactions" violates foreign key constraint "transactions_category_fkey"',
}

describe('financeErrorMessage', () => {
  it('reports a duplicate category when creating and when renaming', () => {
    expect(financeErrorMessage(new DuplicateCategoryError('create'))).toBe('Já existe uma categoria com esse nome.')
    expect(financeErrorMessage(new DuplicateCategoryError('rename'))).toBe(
      'Já existe uma categoria com esse nome. Se estiver arquivada, reativa-a em Arquivadas.',
    )
  })

  it('reports a day after today', () => {
    expect(financeErrorMessage(new FutureDayError())).toBe('A data não pode ser depois de hoje.')
  })

  it('reports a category that is no longer available', () => {
    expect(financeErrorMessage(new CategoryUnavailableError())).toBe(
      'Esta categoria já não está disponível. Escolhe outra.',
    )
  })

  it('says the record no longer exists', () => {
    expect(financeErrorMessage(new NotFoundError())).toBe('Este registo já não existe.')
  })

  it('falls back to the shared messages', () => {
    expect(financeErrorMessage(new ValidationError('Escreve um nome.'))).toBe('Escreve um nome.')
    expect(financeErrorMessage(new TypeError('Failed to fetch'))).toBe(
      'Sem ligação. Tenta outra vez quando voltares a estar online.',
    )
    expect(financeErrorMessage({ code: '23514', message: 'check' })).toBe('Há um valor fora dos limites.')
  })
})

describe('transactionWriteError', () => {
  it('turns a 42501 from the row-level security policy into FutureDayError', () => {
    expect(transactionWriteError(policyViolation)).toBeInstanceOf(FutureDayError)
  })

  it('leaves a 42501 about privileges as it is, for the shared message', () => {
    expect(transactionWriteError(permissionDenied)).toBe(permissionDenied)
    expect(financeErrorMessage(transactionWriteError(permissionDenied))).toBe('Não tens permissão para fazer isto.')
  })

  it('turns a foreign key violation into CategoryUnavailableError', () => {
    expect(transactionWriteError(foreignKeyViolation)).toBeInstanceOf(CategoryUnavailableError)
  })

  it('leaves any other error as it is', () => {
    const check = { code: '23514', message: 'check' }
    expect(transactionWriteError(check)).toBe(check)
  })
})

describe('categoryWriteError', () => {
  it('turns a foreign key violation into CategoryUnavailableError', () => {
    expect(categoryWriteError(foreignKeyViolation)).toBeInstanceOf(CategoryUnavailableError)
  })

  it('leaves a policy violation as it is: only transactions have a date policy', () => {
    expect(categoryWriteError(policyViolation)).toBe(policyViolation)
  })
})

describe('hasCode', () => {
  it('reads the code of a Data API error, and nothing from anything else', () => {
    expect(hasCode({ code: '23505', message: '' }, '23505')).toBe(true)
    expect(hasCode({ code: '23503', message: '' }, '23505')).toBe(false)
    expect(hasCode(new Error('boom'), '23505')).toBe(false)
    expect(hasCode(null, '23505')).toBe(false)
  })
})
