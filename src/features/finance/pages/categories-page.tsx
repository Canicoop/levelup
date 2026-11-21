import { PageHeader } from '@/components/layout/page-header'

const BACK = { to: '/financas', label: 'Voltar às Finanças' }

// The categories screen: create, rename, remove (delete or archive) and
// reactivate. Its content comes with step 7.5's second commit.
export function CategoriesPage() {
  return <PageHeader title="Categorias" back={BACK} />
}
