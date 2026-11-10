// Which finished workout is being sent right now, if any, for "A enviar…". In
// the main chunk, unlike the sender, so Home's line can follow it.

let sendingId: string | null = null
const listeners = new Set<() => void>()

export function subscribeToSending(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getSendingId() {
  return sendingId
}

export function setSendingId(next: string | null) {
  if (next === sendingId) return
  sendingId = next
  for (const listener of listeners) listener()
}
