const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

// The line in Settings about the copy of the data kept on the device:
// "Dados no dispositivo: atualizados há 3 min", or "Nenhuma cópia guardada".
export function formatDeviceCopy(savedAt: number | null, now: number) {
  if (savedAt === null) return 'Nenhuma cópia guardada'
  const age = Math.max(0, now - savedAt)
  let ago: string
  if (age < MINUTE) ago = 'agora mesmo'
  else if (age < HOUR) ago = `há ${Math.floor(age / MINUTE)} min`
  else if (age < DAY) ago = `há ${Math.floor(age / HOUR)} h`
  else {
    const days = Math.floor(age / DAY)
    ago = days === 1 ? 'há 1 dia' : `há ${days} dias`
  }
  return `Dados no dispositivo: atualizados ${ago}`
}
