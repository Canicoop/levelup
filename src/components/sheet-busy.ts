import { createContext, useContext, useEffect } from 'react'

// Provided by BottomSheet: its content reports when it is saving.
export const SetSheetBusyContext = createContext<(busy: boolean) => void>(() => {})

// Called by a sheet's content while it saves. Until it finishes, the sheet
// cannot be closed by the user: the content would unmount mid-save and its
// error would be lost unseen. The content can still close it itself (after a
// save), by calling onOpenChange directly.
export function useSheetBusy(busy: boolean) {
  const setBusy = useContext(SetSheetBusyContext)
  useEffect(() => {
    setBusy(busy)
    return () => setBusy(false)
  }, [busy, setBusy])
}
