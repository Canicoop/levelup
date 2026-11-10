import { useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getNeedsRefresh, subscribeToAppUpdate, updateApp } from '@/lib/app-update'

// Shown on Home and the Workout tab when a new version is waiting, never on the
// workout screen: updating reloads the app, and that should never interrupt a set.
export function UpdateBanner() {
  const needsRefresh = useSyncExternalStore(subscribeToAppUpdate, getNeedsRefresh)
  if (!needsRefresh) return null

  return (
    <Card size="sm" role="status">
      <div className="flex items-center justify-between gap-3 px-3">
        <p className="text-sm font-medium">Há uma versão nova</p>
        <Button variant="outline" onClick={updateApp}>
          Atualizar
        </Button>
      </div>
    </Card>
  )
}
