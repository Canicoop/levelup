import { describe, expect, it } from 'vitest'
import {
  formatDifference,
  formatKg,
  formatWeight,
  parseWeightInput,
  toKg,
  toTenths,
} from '@/features/weight/lib/weight-values'

describe('parseWeightInput', () => {
  it('accepts a comma or a point, and spaces around', () => {
    expect(parseWeightInput('78,4')).toEqual({ ok: true, value: 784 })
    expect(parseWeightInput('78.4')).toEqual({ ok: true, value: 784 })
    expect(parseWeightInput(' 78,4 ')).toEqual({ ok: true, value: 784 })
  })

  it('accepts whole numbers', () => {
    expect(parseWeightInput('78')).toEqual({ ok: true, value: 780 })
  })

  it('ignores trailing zeros after the decimal mark', () => {
    expect(parseWeightInput('78,40')).toEqual({ ok: true, value: 784 })
    expect(parseWeightInput('300,0')).toEqual({ ok: true, value: 3000 })
  })

  it('accepts the limits, 20 and 300 kg', () => {
    expect(parseWeightInput('20')).toEqual({ ok: true, value: 200 })
    expect(parseWeightInput('300')).toEqual({ ok: true, value: 3000 })
  })

  it('asks for a weight when empty', () => {
    expect(parseWeightInput('')).toEqual({ ok: false, error: 'Escreve o peso.' })
    expect(parseWeightInput('   ')).toEqual({ ok: false, error: 'Escreve o peso.' })
  })

  it('refuses more than one decimal', () => {
    expect(parseWeightInput('78,45')).toEqual({ ok: false, error: 'Usa no máximo uma casa decimal.' })
  })

  it('refuses what is not a number', () => {
    for (const raw of ['78,', ',5', 'abc', '-78', '1e2', '78,4,1']) {
      expect(parseWeightInput(raw)).toEqual({ ok: false, error: 'Escreve um número, por exemplo 78,4.' })
    }
  })

  it('refuses weights outside 20 to 300 kg', () => {
    for (const raw of ['19,9', '300,1', '1000', '0']) {
      expect(parseWeightInput(raw)).toEqual({ ok: false, error: 'O peso vai de 20 a 300 kg.' })
    }
  })
})

describe('toTenths and toKg', () => {
  it('convert without floating-point noise', () => {
    expect(toTenths(78.4)).toBe(784)
    expect(toTenths(70.3)).toBe(703)
    expect(toTenths(100)).toBe(1000)
    expect(toKg(784)).toBe(78.4)
    expect(toKg(703)).toBe(70.3)
    expect(toKg(1000)).toBe(100)
  })
})

describe('formatKg and formatWeight', () => {
  it('always show one decimal, with a comma', () => {
    expect(formatKg(784)).toBe('78,4')
    expect(formatKg(780)).toBe('78,0')
    expect(formatWeight(1000)).toBe('100,0 kg')
  })
})

describe('formatDifference', () => {
  it('shows a plus sign for a gain', () => {
    expect(formatDifference(3)).toBe('+0,3 kg')
    expect(formatDifference(25)).toBe('+2,5 kg')
  })

  it('shows a minus sign (U+2212), not a hyphen, for a loss', () => {
    expect(formatDifference(-5)).toBe('−0,5 kg')
    expect(formatDifference(-12)).toBe('−1,2 kg')
  })

  it('says there was no change for 0', () => {
    expect(formatDifference(0)).toBe('sem alteração')
  })
})
