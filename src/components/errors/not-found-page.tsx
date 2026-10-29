import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'

export function NotFoundPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Página não encontrada" />
      <p className="text-muted-foreground">Este endereço não existe.</p>
      <Link to="/" className={buttonVariants({ size: 'lg', className: 'self-start' })}>
        Voltar ao Início
      </Link>
    </div>
  )
}
