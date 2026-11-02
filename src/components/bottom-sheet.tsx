import type { ReactNode, RefObject } from 'react'
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
// or a tap outside. Shared by the workout screens (new routine, sets and reps).
// On wide screens it keeps a phone-like width, centred. The bottom padding
// clears the home indicator.
export function BottomSheet({ open, onOpenChange, title, initialFocus, children }: BottomSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent initialFocus={initialFocus} className="mx-auto max-w-md">
        <DrawerHeader>
          <DrawerTitle className="text-lg font-semibold">{title}</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{children}</div>
      </DrawerContent>
    </Drawer>
  )
}
