// The Data API's row limit: Supabase's "Max rows", left at its default of 1000
// on both projects. A full page means there may be more. A lower setting would
// end the reads early and silently, so it must not go below this (see
// docs/decisions.md, Weight module and Finance module).
export const PAGE_SIZE = 1000

type Page<Row extends { id: string }> = { data: Row[] | null; error: unknown }

// Reads every row of a query, a page at a time, until a page comes back short.
// Each page asks for the ids after the last one it has (a keyset), ordered by
// id, never for an offset: a row written or deleted between two requests would
// shift offsets and repeat or skip one at the boundary. Ids are unique, so no
// row is ever cut between pages. The order the screens need is applied in the
// app.
//
// `page` builds one request: every row for null, the rows with an id after
// `afterId` otherwise, ordered by id and limited to `pageSize`.
export async function readAllPages<Row extends { id: string }>(
  page: (afterId: string | null) => PromiseLike<Page<Row>>,
  pageSize = PAGE_SIZE,
): Promise<Row[]> {
  const rows: Row[] = []
  let afterId: string | null = null
  for (;;) {
    const { data, error } = await page(afterId)
    if (error) throw error
    const batch = data ?? []
    rows.push(...batch)
    if (batch.length < pageSize) return rows
    afterId = batch[batch.length - 1].id
  }
}
