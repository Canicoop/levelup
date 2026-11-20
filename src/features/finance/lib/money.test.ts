import { describe, expect, it } from 'vitest'
import {
  formatAmountInput,
  formatEuros,
  parseAmountInput,
  parseDbAmount,
  toDbAmount,
} from '@/features/finance/lib/money'

const NBSP = '\u00A0'
const NARROW_NBSP = '\u202F'

describe('parseAmountInput', () => {
  it.each([
    ['12,5', 1250],
    ['12.50', 1250],
    ['12', 1200],
    [' 12,50 ', 1250],
    ['0,01', 1],
    ['0.1', 10],
    ['007,5', 750],
    ['1234,56', 123456],
    ['1 234,56', 123456],
    [`1${NBSP}234,56`, 123456],
    [`1${NARROW_NBSP}234,56`, 123456],
    ['99 999,99', 9999999],
    ['99999.99', 9999999],
  ])('reads %j as %i cents', (raw, cents) => {
    expect(parseAmountInput(raw)).toEqual({ ok: true, value: cents })
  })

  it.each([
    ['12,50 €', 1250],
    ['12,50€', 1250],
    ['€12,50', 1250],
    ['€ 12,50', 1250],
    [`12,50${NBSP}€`, 1250],
    [' 1 234,56 € ', 123456],
  ])('ignores a € at either end of %j', (raw, cents) => {
    expect(parseAmountInput(raw)).toEqual({ ok: true, value: cents })
  })

  it.each(['', '   ', '€', ' € '])('asks for the value when %j is empty', (raw) => {
    expect(parseAmountInput(raw)).toEqual({ ok: false, error: 'Escreve o valor.' })
  })

  it.each(['12,345', '1.500', '12,500', '0,001'])('refuses more than two decimals in %j', (raw) => {
    expect(parseAmountInput(raw)).toEqual({ ok: false, error: 'Usa no máximo duas casas decimais.' })
  })

  it.each([
    '-5',
    '+5',
    '\u22125',
    'abc',
    ',5',
    '5,',
    '1.234,56',
    '1,234.56',
    '12 34',
    '1  234',
    '12€50',
    '12 €50',
    '12,5,0',
    '1e3',
  ])('refuses %j: no sign, no points between thousands, € only at the ends', (raw) => {
    expect(parseAmountInput(raw)).toEqual({ ok: false, error: 'Escreve um valor, por exemplo 12,50.' })
  })

  it.each(['0', '0,00', '000000,00', '100000', '100 000', '12345678901234567890'])(
    'refuses %j, outside 0,01 € to 99 999,99 €',
    (raw) => {
      expect(parseAmountInput(raw)).toEqual({ ok: false, error: 'O valor vai de 0,01 € a 99 999,99 €.' })
    },
  )
})

describe('parseDbAmount', () => {
  it.each([
    ['12.50', 1250],
    ['0.01', 1],
    ['1234.00', 123400],
    ['9999999999.99', 999999999999],
  ])('reads %j as %i cents', (text, cents) => {
    expect(parseDbAmount(text)).toBe(cents)
  })

  it.each(['12.5', '12', '-1.00', '1e3', '', ' 12.50', '12.505', '12,50', '11111111111.00'])(
    'throws for %j, which numeric(12, 2)::text never gives',
    (text) => {
      expect(() => parseDbAmount(text)).toThrow('Unexpected amount from the database')
    },
  )
})

describe('toDbAmount', () => {
  it.each([
    [1250, '12.50'],
    [1, '0.01'],
    [100, '1.00'],
    [9999999, '99999.99'],
    [999999999999, '9999999999.99'],
  ])('sends %i cents as %j', (cents, text) => {
    expect(toDbAmount(cents)).toBe(text)
  })

  it('is read back as the same amount', () => {
    for (const cents of [1, 99, 1250, 123456, 9999999]) {
      expect(parseDbAmount(toDbAmount(cents))).toBe(cents)
    }
  })

  it.each([12.5, -1, Number.NaN])('throws for %d, which is not an amount in whole cents', (cents) => {
    expect(() => toDbAmount(cents)).toThrow('Not an amount in whole cents')
  })
})

describe('formatEuros', () => {
  it.each([
    [0, `0,00${NBSP}€`],
    [5, `0,05${NBSP}€`],
    [1250, `12,50${NBSP}€`],
    [123456, `1234,56${NBSP}€`],
    [1234567, `12${NBSP}345,67${NBSP}€`],
    [123456789, `1${NBSP}234${NBSP}567,89${NBSP}€`],
  ])('formats %i cents as %j', (cents, text) => {
    expect(formatEuros(cents)).toBe(text)
  })

  it('writes a negative amount with a minus sign (U+2212), not a hyphen', () => {
    expect(formatEuros(-1250)).toBe(`\u221212,50${NBSP}€`)
    expect(formatEuros(-1234567)).toBe(`\u221212${NBSP}345,67${NBSP}€`)
  })

  it('matches Intl.NumberFormat for pt-PT and EUR', () => {
    // Intl needs a number in euros: the division happens only here, in the
    // test, to compare the two.
    const intl = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
    for (const cents of [0, 1, 5, 99, 100, 1250, 99999, 123456, 999999, 1234567, 9999999, 123456789, 999999999999]) {
      expect(formatEuros(cents)).toBe(intl.format(cents / 100))
    }
  })

  it('throws for an amount that is not in whole cents', () => {
    expect(() => formatEuros(12.5)).toThrow('Not an amount in whole cents')
  })
})

describe('formatAmountInput', () => {
  it.each([
    [123456, '1234,56'],
    [1250, '12,50'],
    [1, '0,01'],
    [9999999, '99999,99'],
  ])('fills the edit field with %i cents as %j', (cents, text) => {
    expect(formatAmountInput(cents)).toBe(text)
  })

  it('is read back as the same amount', () => {
    for (const cents of [1, 99, 1250, 123456, 9999999]) {
      expect(parseAmountInput(formatAmountInput(cents))).toEqual({ ok: true, value: cents })
    }
  })
})
