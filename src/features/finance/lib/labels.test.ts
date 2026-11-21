import { describe, expect, it } from 'vitest'
import { kindLabel } from '@/features/finance/lib/labels'

describe('kindLabel', () => {
  it('names each kind in European Portuguese', () => {
    expect(kindLabel('expense')).toBe('Despesa')
    expect(kindLabel('income')).toBe('Receita')
  })
})
