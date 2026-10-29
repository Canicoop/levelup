import { useEffect, useState, type ReactNode } from 'react'
import { Dumbbell } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// Development-only preview of the shared states. The route is registered only
// when import.meta.env.DEV is true (see src/router.tsx).
export function ComponentsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Componentes" />
      <Section title="Carregamento">
        <LoadingCard />
      </Section>
      <Section title="Vazio">
        <Card>
          <CardHeader>
            <CardTitle>Sem ação</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Dumbbell}
              title="Ainda não registaste nenhum treino"
              description="Aqui vais ver o teu último treino e os dias em que treinaste."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Com ação</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Dumbbell}
              title="Ainda não registaste nenhum treino"
              description="Aqui vais ver o teu último treino e os dias em que treinaste."
              action={<Button>Iniciar treino</Button>}
            />
          </CardContent>
        </Card>
      </Section>
      <Section title="Erro">
        <RetryDemo />
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

// The pattern for loading content: the container is marked busy, the
// placeholders are hidden from assistive technology, and a visually hidden
// label announces the state.
function LoadingCard() {
  return (
    <Card aria-busy="true">
      <span className="sr-only">A carregar…</span>
      <CardHeader aria-hidden>
        <Skeleton className="h-5 w-24" />
      </CardHeader>
      <CardContent aria-hidden className="flex flex-col gap-3">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  )
}

// Retrying shows the loading state for a second, then fails again.
function RetryDemo() {
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    if (!retrying) return
    const timeout = setTimeout(() => setRetrying(false), 1000)
    return () => clearTimeout(timeout)
  }, [retrying])

  if (retrying) return <LoadingCard />

  return (
    <Card>
      <CardContent>
        <ErrorState onRetry={() => setRetrying(true)} />
      </CardContent>
    </Card>
  )
}
