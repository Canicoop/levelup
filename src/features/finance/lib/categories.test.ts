import { describe, expect, it } from 'vitest'
import {
  SUGGESTED_CATEGORIES,
  activeCategories,
  findCategoryByName,
  isCategoryNameTaken,
  resolveNewCategory,
  shouldOfferSuggestions,
  suggestedCategoryRows,
  type Category,
  type Kind,
} from '@/features/finance/lib/categories'
import { characterCount, cleanName, searchKey } from '@/lib/text'

const food: Category = { id: '1', kind: 'expense', name: 'Alimentação', archivedAt: null }
const home: Category = { id: '2', kind: 'expense', name: 'Casa', archivedAt: '2026-11-01T10:00:00Z' }
const otherExpenses: Category = { id: '3', kind: 'expense', name: 'Outros', archivedAt: null }
const salary: Category = { id: '4', kind: 'income', name: 'Salário', archivedAt: null }
const categories = [food, home, otherExpenses, salary]

describe('suggested categories', () => {
  it('are the decided lists, in that order', () => {
    expect(SUGGESTED_CATEGORIES.expense).toEqual([
      'Alimentação',
      'Restaurantes',
      'Transportes',
      'Casa',
      'Saúde',
      'Lazer',
      'Compras',
      'Educação',
      'Outros',
    ])
    expect(SUGGESTED_CATEGORIES.income).toEqual(['Salário', 'Outros'])
  })

  it('become one row per category, with its kind', () => {
    const rows = suggestedCategoryRows()
    expect(rows).toHaveLength(11)
    expect(rows[0]).toEqual({ kind: 'expense', name: 'Alimentação' })
    expect(rows.at(-1)).toEqual({ kind: 'income', name: 'Outros' })
  })

  it('pass the database checks: trimmed, up to 40 characters, never repeated within a kind', () => {
    for (const kind of Object.keys(SUGGESTED_CATEGORIES) as Kind[]) {
      const names: readonly string[] = SUGGESTED_CATEGORIES[kind]
      for (const name of names) {
        expect(cleanName(name)).toBe(name)
        expect(characterCount(name)).toBeGreaterThan(0)
        expect(characterCount(name)).toBeLessThanOrEqual(40)
      }
      expect(new Set(names.map((name) => searchKey(name))).size).toBe(names.length)
    }
  })
})

describe('shouldOfferSuggestions', () => {
  it('offers them with no categories at all', () => {
    expect(shouldOfferSuggestions([])).toBe(true)
  })

  it('does not offer them when the only categories are archived', () => {
    expect(shouldOfferSuggestions([home])).toBe(false)
  })
})

describe('findCategoryByName', () => {
  it.each(['Alimentação', 'alimentacao', 'ALIMENTAÇÃO', '  Alimentação '])(
    'finds %j ignoring case, accents and spaces',
    (name) => {
      expect(findCategoryByName(categories, 'expense', name)).toBe(food)
    },
  )

  it('only looks within the kind', () => {
    expect(findCategoryByName(categories, 'income', 'Alimentação')).toBeUndefined()
    expect(findCategoryByName(categories, 'expense', 'Salário')).toBeUndefined()
  })
})

describe('resolveNewCategory', () => {
  it('creates a new name', () => {
    expect(resolveNewCategory(categories, 'expense', 'Saúde')).toEqual({ action: 'create' })
  })

  it('creates a name that only the other kind has', () => {
    expect(resolveNewCategory(categories, 'income', 'Outros')).toEqual({ action: 'create' })
  })

  it('reactivates an archived category of the same kind, accents and case ignored', () => {
    expect(resolveNewCategory(categories, 'expense', 'casa')).toEqual({ action: 'reactivate', category: home })
    expect(resolveNewCategory(categories, 'expense', 'Cása')).toEqual({ action: 'reactivate', category: home })
  })

  it('refuses the name of an active category of the same kind', () => {
    expect(resolveNewCategory(categories, 'expense', 'OUTROS')).toEqual({ action: 'duplicate' })
  })
})

describe('isCategoryNameTaken', () => {
  it('refuses a name another category of the kind has, archived included', () => {
    expect(isCategoryNameTaken(categories, 'expense', 'alimentacao', otherExpenses.id)).toBe(true)
    expect(isCategoryNameTaken(categories, 'expense', 'Casa', food.id)).toBe(true)
  })

  it('lets a category keep its name or change only its accents or case', () => {
    expect(isCategoryNameTaken(categories, 'expense', 'ALIMENTACAO', food.id)).toBe(false)
  })

  it('accepts a name only the other kind has', () => {
    expect(isCategoryNameTaken(categories, 'income', 'Outros', salary.id)).toBe(false)
  })
})

describe('activeCategories', () => {
  it('keeps the active ones of the kind, by name in European Portuguese, with "Outros" last', () => {
    const list: Category[] = [
      { id: 'a', kind: 'expense', name: 'Saúde', archivedAt: null },
      { id: 'b', kind: 'expense', name: 'Outros', archivedAt: null },
      { id: 'c', kind: 'expense', name: 'Água', archivedAt: null },
      { id: 'd', kind: 'expense', name: 'Casa', archivedAt: null },
      { id: 'e', kind: 'expense', name: 'Alimentação', archivedAt: null },
      { id: 'f', kind: 'expense', name: 'Lazer', archivedAt: '2026-11-01T10:00:00Z' },
      { id: 'g', kind: 'income', name: 'Salário', archivedAt: null },
    ]
    // A plain sort would put "Água" after "Saúde".
    expect(activeCategories(list, 'expense').map((category) => category.name)).toEqual([
      'Água',
      'Alimentação',
      'Casa',
      'Saúde',
      'Outros',
    ])
  })

  it('puts "Outros" last in each kind', () => {
    const list: Category[] = [
      { id: 'a', kind: 'income', name: 'Outros', archivedAt: null },
      { id: 'b', kind: 'income', name: 'Salário', archivedAt: null },
      { id: 'c', kind: 'income', name: 'Prémios', archivedAt: null },
    ]
    expect(activeCategories(list, 'income').map((category) => category.name)).toEqual(['Prémios', 'Salário', 'Outros'])
  })
})
