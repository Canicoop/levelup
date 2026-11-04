import { describe, expect, it } from 'vitest'
import { formatWeight, parseReps, parseWeight, setFieldError } from '@/features/workout/lib/set-values'

describe('parseWeight', () => {
  it.each([
    ['22,5', '22.5'],
    ['22.5', '22.5'],
    ['80', '80'],
    ['0,5', '0.5'],
    ['0,01', '0.01'],
    ['22,50', '22.5'],
    ['80,00', '80'],
    ['007', '7'],
    ['1000', '1000'],
    ['1000,00', '1000'],
    [' 40 ', '40'],
  ])('accepts %j as %j', (raw, value) => {
    expect(parseWeight(raw)).toEqual({ ok: true, value })
  })

  it.each(['', '   '])('asks for a weight when given %j', (raw) => {
    expect(parseWeight(raw)).toEqual({ ok: false, error: 'Escreve o peso.' })
  })

  it.each(['22,', ',5', '22,555', 'abc', '1,2,3', '-5', '1e3', '10000'])('refuses the format of %j', (raw) => {
    expect(parseWeight(raw)).toEqual({ ok: false, error: 'Usa um número com até 2 casas decimais.' })
  })

  it.each(['0', '0,00', '1000,01', '1001'])('refuses %j, outside the limits', (raw) => {
    expect(parseWeight(raw)).toEqual({ ok: false, error: 'O peso vai até 1000 kg e tem de ser maior do que 0.' })
  })
})

describe('parseReps', () => {
  it.each([
    ['1', 1],
    ['12', 12],
    ['100', 100],
    [' 8 ', 8],
    ['08', 8],
  ])('accepts %j as %i', (raw, value) => {
    expect(parseReps(raw)).toEqual({ ok: true, value })
  })

  it('asks for the reps when empty', () => {
    expect(parseReps('  ')).toEqual({ ok: false, error: 'Escreve as repetições.' })
  })

  it.each(['8,5', '8.5', '-1', 'abc'])('refuses %j, which is not a whole number', (raw) => {
    expect(parseReps(raw)).toEqual({ ok: false, error: 'Usa números inteiros.' })
  })

  it.each(['0', '101'])('refuses %j, outside 1 to 100', (raw) => {
    expect(parseReps(raw)).toEqual({ ok: false, error: 'As repetições vão de 1 a 100.' })
  })
})

describe('setFieldError', () => {
  it('is null for valid text and the message otherwise', () => {
    expect(setFieldError('weight', '22,5')).toBeNull()
    expect(setFieldError('weight', '22,')).toBe('Usa um número com até 2 casas decimais.')
    expect(setFieldError('reps', '8')).toBeNull()
    expect(setFieldError('reps', '')).toBe('Escreve as repetições.')
  })
})

describe('formatWeight', () => {
  it.each([
    [22.5, '22,5'],
    [80, '80'],
    [0.25, '0,25'],
  ])('shows %d as %j', (weightKg, text) => {
    expect(formatWeight(weightKg)).toBe(text)
  })
})
