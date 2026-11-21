import type { Kind } from '@/features/finance/lib/categories'
import { kindLabel } from '@/features/finance/lib/labels'

const KINDS: Kind[] = ['expense', 'income']

type KindToggleProps = {
  value: Kind
  onChange: (kind: Kind) => void
  disabled?: boolean
}

// "Despesa" / "Receita": two 44px buttons in one row, styled like the Weight
// page's period filter (see PeriodFilter): the selected one is the surface
// with the main text and a hairline, quieter than the primary action.
export function KindToggle({ value, onChange, disabled = false }: KindToggleProps) {
  return (
    <div role="group" aria-label="Tipo" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
      {KINDS.map((kind) => {
        const selected = kind === value
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(kind)}
            className={`min-h-11 touch-manipulation rounded-lg text-sm font-medium outline-none select-none transition-[opacity,background-color,color] duration-150 ease-out focus-visible:ring-3 focus-visible:ring-ring active:opacity-70 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none ${
              selected
                ? 'bg-card text-foreground ring-1 ring-border dark:bg-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {kindLabel(kind)}
          </button>
        )
      })}
    </div>
  )
}
