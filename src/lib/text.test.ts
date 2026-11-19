import { describe, expect, it } from 'vitest'
import { cleanName, searchKey } from '@/lib/text'

describe('cleanName', () => {
  it.each([
    ['  Supino  ', 'Supino'],
    ['Supino   inclinado', 'Supino inclinado'],
    ['\tSupino\n inclinado ', 'Supino inclinado'],
    ['', ''],
    ['   ', ''],
  ])('cleans %j to %j', (raw, expected) => {
    expect(cleanName(raw)).toBe(expected)
  })
})

describe('searchKey', () => {
  it.each([
    ['Elevação lateral', 'elevacao lateral'],
    ['  PRÉ-exaustão ', 'pre-exaustao'],
    ['Peck   deck', 'peck deck'],
  ])('turns %j into %j', (text, expected) => {
    expect(searchKey(text)).toBe(expected)
  })
})
