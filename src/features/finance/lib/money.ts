// Money is whole cents (12,50 € is 1250), so totals and budgets carry no
// floating-point noise. Only the edges convert: from what the user typed, from
// the database's text (amount::text), and back to text to send. An amount
// never passes through a floating-point number (see docs/decisions.md,
// Finance module).

export type Cents = number

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

// The form's range (see docs/decisions.md, Finance module). The database only
// refuses 0 or less.
export const MIN_CENTS = 1
export const MAX_CENTS = 9_999_999

// Digits before the decimal mark of the largest amount (99999), checked before
// converting so a long number is never rounded by Number().
const MAX_WHOLE_DIGITS = 5

// Spaces that may group thousands: a normal space, a no-break space (U+00A0,
// what Intl uses for pt-PT) and a narrow no-break space (U+202F).
const GROUP = '[ \\u00A0\\u202F]'
// Plain digits ("1234"), or one to three digits and groups of three ("1 234").
// Points never group thousands: a point is always the decimal mark.
const WHOLE = `(?:\\d+|\\d{1,3}(?:${GROUP}\\d{3})+)`
const AMOUNT_PATTERN = new RegExp(`^(${WHOLE})(?:[.,](\\d+))?$`)
// A € at either end, with or without a space, as in a pasted "12,50 €".
const EURO_AT_ENDS = /^€\s*|\s*€$/g

const RANGE_ERROR = 'O valor vai de 0,01 € a 99 999,99 €.'

// What the user typed, with a comma or a point as the decimal mark and at most
// two decimals. Unlike the Weight module, extra zeros are not ignored: "1.500"
// typed as 1500 € must not become 1,50 €. No sign: the kind says which way the
// money went.
export function parseAmountInput(raw: string): Parsed<Cents> {
  const text = raw.trim().replace(EURO_AT_ENDS, '')
  if (text === '') return { ok: false, error: 'Escreve o valor.' }

  const match = AMOUNT_PATTERN.exec(text)
  if (!match) return { ok: false, error: 'Escreve um valor, por exemplo 12,50.' }

  const [, wholeText, fraction = ''] = match
  if (fraction.length > 2) return { ok: false, error: 'Usa no máximo duas casas decimais.' }

  const digits = wholeText.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  if (digits.length > MAX_WHOLE_DIGITS) return { ok: false, error: RANGE_ERROR }

  const cents = Number(digits) * 100 + Number(fraction.padEnd(2, '0'))
  if (cents < MIN_CENTS || cents > MAX_CENTS) return { ok: false, error: RANGE_ERROR }
  return { ok: true, value: cents }
}

// numeric(12, 2)::text: up to ten digits, a point and always two decimals.
const DB_AMOUNT_PATTERN = /^(\d{1,10})\.(\d{2})$/

// The database's amount::text ("12.50") as cents. Anything else is a bug, not
// user input, so it throws: the read fails visibly instead of showing a wrong
// amount.
export function parseDbAmount(text: string): Cents {
  const match = DB_AMOUNT_PATTERN.exec(text)
  if (!match) throw new Error(`Unexpected amount from the database: ${JSON.stringify(text)}`)
  return Number(match[1]) * 100 + Number(match[2])
}

function assertCents(cents: Cents) {
  if (!Number.isSafeInteger(cents)) throw new Error(`Not an amount in whole cents: ${cents}`)
}

// Whole euros and the cents after them, both by integer arithmetic.
function split(cents: Cents) {
  const absolute = Math.abs(cents)
  const fraction = absolute % 100
  return { whole: String((absolute - fraction) / 100), fraction: String(fraction).padStart(2, '0') }
}

// Cents as the text sent to the database: 1250 becomes "12.50".
export function toDbAmount(cents: Cents): string {
  assertCents(cents)
  if (cents < 0) throw new Error(`Not an amount in whole cents: ${cents}`)
  const { whole, fraction } = split(cents)
  return `${whole}.${fraction}`
}

const NO_BREAK_SPACE = '\u00A0'
const MINUS_SIGN = '\u2212'

// pt-PT groups thousands only from five digits ("1234", but "12 345"), with a
// no-break space, as Intl.NumberFormat('pt-PT') does.
function groupThousands(digits: string) {
  if (digits.length < 5) return digits
  return digits.replace(/\B(?=(\d{3})+$)/g, NO_BREAK_SPACE)
}

// "1234,56 €", "12 345,67 €", "0,05 €". Built from integers rather than with
// Intl.NumberFormat, which would need the amount as a floating-point number.
// A negative amount (a balance) has a minus sign (U+2212), as in the Weight
// module's differences, where Intl would use a hyphen.
export function formatEuros(cents: Cents): string {
  assertCents(cents)
  const { whole, fraction } = split(cents)
  return `${cents < 0 ? MINUS_SIGN : ''}${groupThousands(whole)},${fraction}${NO_BREAK_SPACE}€`
}

// The edit field's value: "1234,56", with no grouping and no €, which
// parseAmountInput reads back as the same amount.
export function formatAmountInput(cents: Cents): string {
  assertCents(cents)
  const { whole, fraction } = split(cents)
  return `${whole},${fraction}`
}
