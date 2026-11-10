// TanStack Query assumes it is online when the app starts, and only changes on
// the `online` and `offline` events. An app opened already offline (an iPhone
// in airplane mode) gets neither, so its reads tried the network and retried
// for a long time instead of pausing, and "Sem ligação…" (shown for a paused
// read) never appeared. Starting from navigator.onLine fixes that; the events
// keep it up to date afterwards.
export function startOnlineFromNavigator(
  manager: { setOnline: (online: boolean) => void },
  nav: { onLine: boolean } | undefined,
) {
  if (nav) manager.setOnline(nav.onLine)
}
