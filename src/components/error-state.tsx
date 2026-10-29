import { CircleAlert, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ErrorStateProps = {
  title?: string
  description?: string
  onRetry: () => void
}

// Shown when data fails to load. The muted red is reserved for errors, so it
// marks only the icon; the retry button stays neutral.
export function ErrorState({
  title = 'Não foi possível carregar',
  description = 'Verifica a ligação e tenta outra vez.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3">
      <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <CircleAlert aria-hidden className="size-5" strokeWidth={1.75} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-balance">{title}</p>
        <p className="text-sm text-pretty text-muted-foreground">{description}</p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        <RotateCw aria-hidden data-icon="inline-start" />
        Tentar outra vez
      </Button>
    </div>
  )
}
