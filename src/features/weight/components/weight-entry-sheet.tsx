import { useId, useRef, useState, type FormEvent, type RefObject } from 'react'
import { BottomSheet } from '@/components/bottom-sheet'
import { useSheetBusy } from '@/components/sheet-busy'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDeleteWeightEntry, useSaveTodayWeight } from '@/features/weight/hooks/use-weight-mutations'
import type { WeightEntry } from '@/features/weight/lib/entries'
import { weightErrorMessage } from '@/features/weight/lib/errors'
import { formatDeleteQuestion, formatEntryDate } from '@/features/weight/lib/labels'
import type { DayKey } from '@/features/weight/lib/lisbon-day'
import { formatKg, formatWeight, parseWeightInput, type Tenths } from '@/features/weight/lib/weight-values'

// What the sheet is for, decided when it opens. `openedOn` is Lisbon's day at
// that moment: saving after it changed is refused (see saveTodayWeight).
export type WeightSheetTarget =
  | { kind: 'new'; openedOn: DayKey; placeholder: Tenths | null }
  | { kind: 'today'; openedOn: DayKey; entry: WeightEntry }
  | { kind: 'past'; openedOn: DayKey; entry: WeightEntry }

type WeightEntrySheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Kept by the caller while the sheet closes, so its content does not vanish
  // during the slide down.
  target: WeightSheetTarget | null
}

// Logs today's weight, edits it, or shows an older entry to delete it. Deleting
// asks for confirmation in the same sheet.
export function WeightEntrySheet({ open, onOpenChange, target }: WeightEntrySheetProps) {
  const [step, setStep] = useState<'main' | 'delete'>('main')
  // Each opening starts on the main step, even if the last one ended on the confirmation.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setStep('main')
  }
  const inputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const close = () => onOpenChange(false)

  const title = !target
    ? ''
    : step === 'delete' && target.kind !== 'new'
      ? formatDeleteQuestion(target.entry.day, target.openedOn)
      : target.kind === 'new'
        ? 'Registar peso'
        : target.kind === 'today'
          ? 'Peso de hoje'
          : formatEntryDate(target.entry.day, target.openedOn)

  // The keyboard comes up at once only where typing comes next.
  const typing = target?.kind !== 'past' && step === 'main'

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      initialFocus={typing ? inputRef : contentRef}
    >
      <div ref={contentRef} tabIndex={-1} className="outline-none">
        {target &&
          (step === 'delete' && target.kind !== 'new' ? (
            <DeleteConfirm entry={target.entry} onCancel={() => setStep('main')} onDone={close} />
          ) : target.kind === 'past' ? (
            <PastEntry entry={target.entry} onDelete={() => setStep('delete')} />
          ) : (
            <div className="flex flex-col gap-2">
              <WeightForm
                inputRef={inputRef}
                initial={target.kind === 'today' ? target.entry.tenths : null}
                placeholder={target.kind === 'new' ? target.placeholder : null}
                openedOn={target.openedOn}
                onDone={close}
              />
              {target.kind === 'today' && (
                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => setStep('delete')}
                >
                  Apagar registo
                </Button>
              )}
            </div>
          ))}
      </div>
    </BottomSheet>
  )
}

function WeightForm({
  inputRef,
  initial,
  placeholder,
  openedOn,
  onDone,
}: {
  inputRef: RefObject<HTMLInputElement | null>
  initial: Tenths | null
  // The latest weight, as a hint for a new entry.
  placeholder: Tenths | null
  openedOn: DayKey
  onDone: () => void
}) {
  const save = useSaveTodayWeight()
  useSheetBusy(save.isPending)
  const [text, setText] = useState(initial === null ? '' : formatKg(initial))
  const [invalid, setInvalid] = useState<string | null>(null)
  const inputId = useId()
  const errorId = useId()

  const error = invalid ?? (save.error ? weightErrorMessage(save.error) : null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (save.isPending) return
    const parsed = parseWeightInput(text)
    if (!parsed.ok) {
      setInvalid(parsed.error)
      inputRef.current?.focus()
      return
    }
    save.mutate({ tenths: parsed.value, openedOn }, { onSuccess: onDone })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-sm font-medium">
          Peso
        </label>
        <div className="relative">
          <Input
            ref={inputRef}
            id={inputId}
            value={text}
            onChange={(event) => {
              setText(event.target.value)
              setInvalid(null)
              save.reset()
            }}
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="done"
            placeholder={placeholder === null ? undefined : formatKg(placeholder)}
            className="pr-10 tabular-nums"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
          >
            kg
          </span>
        </div>
        {error && (
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={save.isPending}>
        {save.isPending ? 'A guardar…' : 'Guardar'}
      </Button>
    </form>
  )
}

function PastEntry({ entry, onDelete }: { entry: WeightEntry; onDelete: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatWeight(entry.tenths)}</p>
        <p className="text-sm text-pretty text-muted-foreground">Só o registo de hoje pode ser alterado.</p>
      </div>
      <Button variant="destructive" size="lg" className="w-full" onClick={onDelete}>
        Apagar registo
      </Button>
    </div>
  )
}

function DeleteConfirm({ entry, onCancel, onDone }: { entry: WeightEntry; onCancel: () => void; onDone: () => void }) {
  const remove = useDeleteWeightEntry()
  useSheetBusy(remove.isPending)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm text-pretty text-muted-foreground tabular-nums">
        {formatWeight(entry.tenths)}. Não é possível desfazer.
      </p>
      {remove.error && (
        <p role="alert" className="text-center text-sm text-destructive">
          {weightErrorMessage(remove.error)}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Button
          variant="destructive"
          size="lg"
          className="w-full"
          disabled={remove.isPending}
          onClick={() => remove.mutate(entry.id, { onSuccess: onDone })}
        >
          {remove.isPending ? 'A apagar…' : 'Apagar'}
        </Button>
        <Button variant="outline" size="lg" className="w-full" disabled={remove.isPending} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
