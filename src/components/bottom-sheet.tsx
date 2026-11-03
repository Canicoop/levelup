import { useState, type ReactNode, type RefObject } from 'react'
import { SetSheetBusyContext } from '@/components/sheet-busy'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'

type BottomSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  // The element focused when the sheet opens, usually its first field.
  initialFocus?: RefObject<HTMLElement | null>
  children: ReactNode
}

// A panel that slides up from the bottom and closes with a swipe down, Escape
// or a tap outside, except while its content saves (see useSheetBusy). Shared
// by the workout screens (routine name, sets and reps, archiving).
// On wide screens it keeps a phone-like width, centred. The bottom padding
// clears the home indicator.
export function BottomSheet({ open, onOpenChange, title, initialFocus, children }: BottomSheetProps) {
  const [busy, setBusy] = useState(false)

  return (
    <Drawer
      open={open}
      onOpenChange={(next, details) => {
        // While busy, closing by Escape or a swipe is cancelled; a tap outside
        // is ignored through disablePointerDismissal.
        if (!next && busy) {
          details.cancel()
          return
        }
        onOpenChange(next)
      }}
      disablePointerDismissal={busy}
      showSwipeHandle
    >
      <DrawerContent initialFocus={initialFocus} className="mx-auto max-w-md">
        <DrawerHeader>
          <DrawerTitle className="text-lg font-semibold text-balance">{title}</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <SetSheetBusyContext value={setBusy}>{children}</SetSheetBusyContext>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
