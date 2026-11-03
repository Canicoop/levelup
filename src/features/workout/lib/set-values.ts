// The two values of a set, as typed. They stay as text in the workout in
// progress: "22," is a normal step on the way to "22,5", and a number could not
// hold it.
export type SetField = 'weight' | 'reps'

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

const WEIGHT_PATTERN = /^\d{1,4}(?:[.,]\d{1,2})?$/
const MAX_WEIGHT_HUNDREDTHS = 100_000

// Same rules as the workout_sets checks: above 0, up to 1000, two decimals at
// most. A comma or a point is accepted. The limits are compared in whole
// hundredths, and the value stays text ("22.5"), so no floating point is
// involved; the database reads it as numeric.
export function parseWeight(raw: string): Parsed<string> {
  const text = raw.trim()
  if (text === '') return { ok: false, error: 'Escreve o peso.' }
  if (!WEIGHT_PATTERN.test(text)) return { ok: false, error: 'Usa um número com até 2 casas decimais.' }

  const [whole, fraction = ''] = text.replace(',', '.').split('.')
  const hundredths = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (hundredths <= 0 || hundredths > MAX_WEIGHT_HUNDREDTHS) {
    return { ok: false, error: 'O peso vai até 1000 kg e tem de ser maior do que 0.' }
  }

  const decimals = fraction.replace(/0+$/, '')
  return { ok: true, value: decimals ? `${Number(whole)}.${decimals}` : `${Number(whole)}` }
}

// Same rules as the workout_sets check: a whole number from 1 to 100.
export function parseReps(raw: string): Parsed<number> {
  const text = raw.trim()
  if (text === '') return { ok: false, error: 'Escreve as repetições.' }
  if (!/^\d+$/.test(text)) return { ok: false, error: 'Usa números inteiros.' }

  const reps = Number(text)
  if (reps < 1 || reps > 100) return { ok: false, error: 'As repetições vão de 1 a 100.' }
  return { ok: true, value: reps }
}

// The error to show for a field, or null when the text is valid.
export function setFieldError(field: SetField, text: string) {
  const parsed = field === 'weight' ? parseWeight(text) : parseReps(text)
  return parsed.ok ? null : parsed.error
}

// What a field of a logged set shows when it loses focus: what was typed if it
// is valid, otherwise the last saved value. While typing, the text lives in a
// draft in the field, because it passes through invalid values on the way
// ("40" to "45" empties the field; "22," waits for the "5").
export function settleSetField(field: SetField, draft: string, saved: string) {
  return setFieldError(field, draft) === null ? draft : saved
}

// A weight from the database, as the field shows it: 22.5 becomes "22,5".
export function formatWeight(weightKg: number) {
  return String(weightKg).replace('.', ',')
}
