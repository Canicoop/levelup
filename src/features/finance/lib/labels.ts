import type { Kind } from '@/features/finance/lib/categories'

// "Despesa" or "Receita": the segmented control, an archived category's row
// ("Casa · Despesa") and screen-reader labels.
export function kindLabel(kind: Kind) {
  return kind === 'expense' ? 'Despesa' : 'Receita'
}
