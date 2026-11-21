import { describe, expect, it } from 'vitest'
import { PAGE_SIZE, readAllPages } from '@/features/finance/api/paging'

type Row = { id: string }

// A fake table of ids, read the way readAllPages asks: the ids after `afterId`,
// in id order, `pageSize` at a time. It records every afterId it was asked for.
function fakeTable(ids: string[], pageSize: number) {
  const asked: (string | null)[] = []
  const page = async (afterId: string | null) => {
    asked.push(afterId)
    const data: Row[] = ids
      .filter((id) => afterId === null || id > afterId)
      .sort()
      .slice(0, pageSize)
      .map((id) => ({ id }))
    return { data, error: null }
  }
  return { page, asked }
}

describe('readAllPages', () => {
  it('reads a short first page with one request', async () => {
    const { page, asked } = fakeTable(['a', 'b'], 3)
    expect(await readAllPages(page, 3)).toEqual([{ id: 'a' }, { id: 'b' }])
    expect(asked).toEqual([null])
  })

  it('asks for the ids after the last one of each full page, until a page comes back short', async () => {
    const { page, asked } = fakeTable(['e', 'a', 'd', 'b', 'c'], 2)
    expect(await readAllPages(page, 2)).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }])
    expect(asked).toEqual([null, 'b', 'd'])
  })

  it('stops at an empty page after full ones', async () => {
    const { page, asked } = fakeTable(['a', 'b', 'c', 'd'], 2)
    expect(await readAllPages(page, 2)).toHaveLength(4)
    expect(asked).toEqual([null, 'b', 'd'])
  })

  it('reads nothing from an empty table', async () => {
    const { page } = fakeTable([], 2)
    expect(await readAllPages(page, 2)).toEqual([])
  })

  it('throws the error of a page', async () => {
    const failure = { code: 'PGRST301', message: 'JWT expired' }
    await expect(readAllPages(async () => ({ data: null, error: failure }))).rejects.toBe(failure)
  })

  it('uses the Data API\'s row limit by default', () => {
    expect(PAGE_SIZE).toBe(1000)
  })
})
