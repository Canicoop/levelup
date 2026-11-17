// Weights are whole tenths of a kg (78.4 kg is 784), so differences and
// averages carry no floating-point noise: 784 - 789 is exactly -5. Only the
// edges convert: from the database's number, and back to a number to send.

export type Tenths = number

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

// The form's range for real use (see docs/decisions.md, Weight module). The
// database only refuses impossible values (0 or less, above 500).
const MIN_TENTHS = 200
const MAX_TENTHS = 3000

const NUMBER_PATTERN = /^\d+(?:[.,]\d+)?$/

// What the user typed, with a comma or a point. Trailing zeros after the
// decimal mark do not count as decimals ("78,40" is 78,4), as in the workout's
// parseWeight. The value never passes through a floating-point number.
export function parseWeightInput(raw: string): Parsed<Tenths> {
  const text = raw.trim()
  if (text === '') return { ok: false, error: 'Escreve o peso.' }
  if (!NUMBER_PATTERN.test(text)) return { ok: false, error: 'Escreve um número, por exemplo 78,4.' }

  const [whole, fraction = ''] = text.replace(',', '.').split('.')
  const decimals = fraction.replace(/0+$/, '')
  if (decimals.length > 1) return { ok: false, error: 'Usa no máximo uma casa decimal.' }

  const tenths = Number(whole) * 10 + Number(decimals || '0')
  if (tenths < MIN_TENTHS || tenths > MAX_TENTHS) return { ok: false, error: 'O peso vai de 20 a 300 kg.' }
  return { ok: true, value: tenths }
}

// The database's weight_kg (a JSON number with at most one decimal) as tenths.
export function toTenths(weightKg: number): Tenths {
  return Math.round(weightKg * 10)
}

// Tenths as the number sent to the database: 784 becomes 78.4.
export function toKg(tenths: Tenths) {
  return tenths / 10
}

// "78,4", always with one decimal ("78,0"). Also the edit field's value.
export function formatKg(tenths: Tenths) {
  return `${Math.floor(tenths / 10)},${tenths % 10}`
}

// "78,4 kg".
export function formatWeight(tenths: Tenths) {
  return `${formatKg(tenths)} kg`
}

// "+0,3 kg", "−0,5 kg" (with a minus sign, U+2212, not a hyphen) or "sem
// alteração". Neutral text: with no goal, neither direction is good or bad.
export function formatDifference(tenths: Tenths) {
  if (tenths === 0) return 'sem alteração'
  return `${tenths > 0 ? '+' : '−'}${formatWeight(Math.abs(tenths))}`
}
