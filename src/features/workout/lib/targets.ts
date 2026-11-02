import type { Targets } from '@/features/workout/lib/types'

// A new routine entry: 3 sets, no rep range.
export const DEFAULT_TARGETS: Targets = { target_sets: 3, rep_min: null, rep_max: null }

// Raw values from the targets panel: the sets come from − / + buttons, the
// reps from two text fields that may be empty.
export type TargetsInput = { targetSets: number; repMin: string; repMax: string }

export type TargetsResult = { ok: true; value: Targets } | { ok: false; error: string }

function parseReps(raw: string) {
  const text = raw.trim()
  if (text === '') return null
  if (!/^-?\d+$/.test(text)) return 'invalid' as const
  return Number(text)
}

// Same rules as the routine_exercises checks: sets 1 to 20; reps both empty, or
// 1 <= min <= max <= 100. A single number counts as min = max.
export function validateTargets({ targetSets, repMin, repMax }: TargetsInput): TargetsResult {
  if (!Number.isInteger(targetSets) || targetSets < 1 || targetSets > 20) {
    return { ok: false, error: 'As séries vão de 1 a 20.' }
  }

  const min = parseReps(repMin)
  const max = parseReps(repMax)
  if (min === 'invalid' || max === 'invalid') {
    return { ok: false, error: 'Usa números inteiros.' }
  }

  const low = min ?? max
  const high = max ?? min
  if (low === null || high === null) {
    return { ok: true, value: { target_sets: targetSets, rep_min: null, rep_max: null } }
  }
  if (low < 1 || low > 100 || high < 1 || high > 100) {
    return { ok: false, error: 'As repetições vão de 1 a 100.' }
  }
  if (low > high) {
    return { ok: false, error: 'O mínimo não pode ser maior do que o máximo.' }
  }
  return { ok: true, value: { target_sets: targetSets, rep_min: low, rep_max: high } }
}

// "3 × 8–12", "3 × 10" (min = max), or "3 séries" / "1 série" without reps.
export function formatTargets({ target_sets, rep_min, rep_max }: Targets) {
  if (rep_min === null || rep_max === null) {
    return target_sets === 1 ? '1 série' : `${target_sets} séries`
  }
  const reps = rep_min === rep_max ? `${rep_min}` : `${rep_min}–${rep_max}`
  return `${target_sets} × ${reps}`
}
