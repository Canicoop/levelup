import { useSyncExternalStore } from 'react'
import { getAccountId, subscribeToAccount } from '@/features/auth/account'
import { formatDeviceCopy } from '@/features/settings/lib/device-copy'
import { useNow } from '@/hooks/use-now'
import { copySavedAt, queryCacheKey } from '@/lib/query-persistence'

function readSavedAt(accountId: string | null) {
  if (!accountId) return null
  try {
    return copySavedAt(localStorage.getItem(queryCacheKey(accountId)))
  } catch {
    return null
  }
}

// A quiet line saying how fresh the copy of the Workout data on the device is,
// so readiness for the gym can be checked before leaving. Read again every
// 30 seconds and when the app comes back to the foreground (useNow).
export function DeviceCopyStatus() {
  const now = useNow(30_000)
  const accountId = useSyncExternalStore(subscribeToAccount, getAccountId)

  return <p className="text-sm text-muted-foreground">{formatDeviceCopy(readSavedAt(accountId), now.getTime())}</p>
}
