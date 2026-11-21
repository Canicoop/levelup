import { searchKey } from '@/lib/text'

// A category is for expenses or for income, and a transaction only takes one
// of its own kind (see docs/decisions.md, Finance module).
export type Kind = 'expense' | 'income'

export type Category = {
  id: string
  kind: Kind
  name: string
  archivedAt: string | null
}

// Offered with "Criar categorias sugeridas" when there are no categories, and
// created only with that tap.
export const SUGGESTED_CATEGORIES = {
  expense: ['Alimentação', 'Restaurantes', 'Transportes', 'Casa', 'Saúde', 'Lazer', 'Compras', 'Educação', 'Outros'],
  income: ['Salário', 'Outros'],
} as const satisfies Record<Kind, readonly string[]>

// The rows for one insert with every suggested category.
export function suggestedCategoryRows(): { kind: Kind; name: string }[] {
  return (Object.keys(SUGGESTED_CATEGORIES) as Kind[]).flatMap((kind) => {
    const names: readonly string[] = SUGGESTED_CATEGORIES[kind]
    return names.map((name) => ({ kind, name }))
  })
}

// Only with no categories at all, archived ones included: someone who archived
// their own is not offered the suggestions again.
export function shouldOfferSuggestions(categories: Category[]) {
  return categories.length === 0
}

// Names are compared with searchKey, as exercise names: cleaned, lower case and
// without accents, and only within the kind ("Outros" exists once per kind).
export function findCategoryByName(categories: Category[], kind: Kind, name: string) {
  const key = searchKey(name)
  return categories.find((category) => category.kind === kind && searchKey(category.name) === key)
}

// What creating a category with this name should do: create it, reactivate an
// archived one of the same kind with the same name, or refuse because an
// active one exists. The same rule as exercises.
export function resolveNewCategory(
  categories: Category[],
  kind: Kind,
  name: string,
): { action: 'create' } | { action: 'reactivate'; category: Category } | { action: 'duplicate' } {
  const existing = findCategoryByName(categories, kind, name)
  if (!existing) return { action: 'create' }
  if (existing.archivedAt) return { action: 'reactivate', category: existing }
  return { action: 'duplicate' }
}

// Whether another category of the same kind (not `exceptId`, the one being
// renamed) already has this name. A category can be renamed to an accent or
// case variant of itself.
export function isCategoryNameTaken(categories: Category[], kind: Kind, name: string, exceptId: string) {
  return findCategoryByName(
    categories.filter((category) => category.id !== exceptId),
    kind,
    name,
  ) !== undefined
}

const nameCollator = new Intl.Collator('pt-PT')

function isOthers(name: string) {
  return searchKey(name) === 'outros'
}

// By name as European Portuguese sorts it ("Água" before "Alimentação"), with
// "Outros" always last.
export function compareCategoryNames(a: string, b: string) {
  const others = Number(isOthers(a)) - Number(isOthers(b))
  return others !== 0 ? others : nameCollator.compare(a, b)
}

// The categories a new transaction, budget or subscription can use: active, of
// this kind, in name order.
export function activeCategories(categories: Category[], kind: Kind) {
  return categories
    .filter((category) => category.kind === kind && category.archivedAt === null)
    .sort((a, b) => compareCategoryNames(a.name, b.name))
}
