import { registerSW } from 'virtual:pwa-register'

// The service worker keeps the app on the device, so it opens without network
// (vite-plugin-pwa, see vite.config.ts). A new version waits: the app says so
// ("Há uma versão nova") and only loads it when the user taps "Atualizar".
// Nothing reloads by itself.

const UPDATE_CHECK_MS = 60 * 60 * 1000

let needsRefresh = false
let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null
const listeners = new Set<() => void>()

// Production builds only: `npm run dev` has no service worker.
export function startAppUpdates() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

  applyUpdate = registerSW({
    onNeedRefresh() {
      needsRefresh = true
      for (const listener of listeners) listener()
    },
    // An installed app can stay open for days, so it also looks for a new
    // version every hour and whenever it comes back to the foreground. Without
    // network the check fails quietly.
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => void registration.update().catch(() => {})
      setInterval(check, UPDATE_CHECK_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })
}

export function subscribeToAppUpdate(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getNeedsRefresh() {
  return needsRefresh
}

// Activates the waiting version and reloads. A workout in progress is on the
// device, so it survives.
export function updateApp() {
  void applyUpdate?.(true)
}
