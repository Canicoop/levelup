import { useEffect, useState } from 'react'

// The current time, refreshed every interval and whenever the page becomes
// visible again. An installed app can stay in memory for hours, so values
// derived from the time (greeting, date) would otherwise go stale.
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const update = () => setNow(new Date())
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') update()
    }

    const interval = setInterval(update, intervalMs)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [intervalMs])

  return now
}
