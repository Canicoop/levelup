import { buttonVariants } from '@/components/ui/button'

// Replaces React Router's default error screen, which is in English.
// Renders outside the app shell, so it pads itself away from the notch.
export function RouteError() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]">
      <title>Erro · LevelUP</title>
      <h1 className="text-3xl font-semibold tracking-tight">Algo correu mal</h1>
      <p className="text-muted-foreground">
        Ocorreu um erro inesperado. Tenta voltar ao Início.
      </p>
      {/* A full page load, so the app starts again from a clean state. */}
      <a href="/" className={buttonVariants({ size: 'lg', className: 'self-start' })}>
        Voltar ao Início
      </a>
    </main>
  )
}
