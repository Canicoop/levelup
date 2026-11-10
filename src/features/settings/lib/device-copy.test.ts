import { describe, expect, it } from 'vitest'
import { formatDeviceCopy } from '@/features/settings/lib/device-copy'

const NOW = 1_800_000_000_000
const MINUTE = 60_000

describe('formatDeviceCopy', () => {
  it('says there is no copy', () => {
    expect(formatDeviceCopy(null, NOW)).toBe('Nenhuma cópia guardada')
  })

  it.each([
    [0, 'agora mesmo'],
    [59 * 1000, 'agora mesmo'],
    [MINUTE, 'há 1 min'],
    [3 * MINUTE, 'há 3 min'],
    [59 * MINUTE, 'há 59 min'],
    [60 * MINUTE, 'há 1 h'],
    [23 * 60 * MINUTE, 'há 23 h'],
    [24 * 60 * MINUTE, 'há 1 dia'],
    [3 * 24 * 60 * MINUTE, 'há 3 dias'],
  ])('shows a copy saved %i ms ago as "%s"', (age, ago) => {
    expect(formatDeviceCopy(NOW - age, NOW)).toBe(`Dados no dispositivo: atualizados ${ago}`)
  })

  it('treats a clock that went back as just now', () => {
    expect(formatDeviceCopy(NOW + MINUTE, NOW)).toBe('Dados no dispositivo: atualizados agora mesmo')
  })
})
