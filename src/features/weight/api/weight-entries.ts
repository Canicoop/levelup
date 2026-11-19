import { dayChanged, toWeightEntry, type WeightEntry } from '@/features/weight/lib/entries'
import { DayChangedError } from '@/features/weight/lib/errors'
import { toKg, type Tenths } from '@/features/weight/lib/weight-values'
import { requireRows } from '@/lib/errors'
import type { DayKey } from '@/lib/lisbon-day'
import { supabase } from '@/lib/supabase'

const COLUMNS = 'id, entry_date, weight_kg'

// The Data API's row limit: Supabase's "Max rows", left at its default of 1000
// on both projects. A full page means there may be more. A lower setting would
// end the read early and silently, so it must not go below this (see
// docs/decisions.md, Weight module).
const PAGE_SIZE = 1000

// What the app may write: the weight only. The generated Insert type also
// allows entry_date, user_id and id, which the database refuses (see
// docs/decisions.md, Privileges and RLS).
type WeightEntryWrite = { weight_kg: number }

// Every entry of the user, newest first. Read in pages, so "Tudo" keeps the
// oldest entries once there are more than a page (about three years of daily
// weighing). Each page asks for the days before the last one it has (a
// keyset), not for an offset: an entry logged or deleted between two requests
// would shift offsets and repeat or skip one at the boundary. Days are unique
// per user, so no entry is ever cut between pages.
export async function fetchWeightEntries(): Promise<WeightEntry[]> {
  const entries: WeightEntry[] = []
  let before: DayKey | null = null
  for (;;) {
    const query = supabase.from('weight_entries').select(COLUMNS)
    const { data, error } = await (before === null ? query : query.lt('entry_date', before))
      .order('entry_date', { ascending: false })
      .limit(PAGE_SIZE)
    if (error) throw error
    entries.push(...data.map(toWeightEntry))
    if (data.length < PAGE_SIZE) return entries
    before = data[data.length - 1].entry_date
  }
}

// Logs or replaces today's weight. The database sets the day (Lisbon's) and the
// user. `openedOn` is the day the sheet opened: if Lisbon's day changed since,
// nothing is sent, since the value was meant for the day before.
export async function saveTodayWeight(tenths: Tenths, openedOn: DayKey, now = new Date()): Promise<WeightEntry> {
  if (dayChanged(openedOn, now)) throw new DayChangedError()

  const write: WeightEntryWrite = { weight_kg: toKg(tenths) }
  const { data, error } = await supabase
    .from('weight_entries')
    .upsert(write, { onConflict: 'user_id,entry_date' })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return toWeightEntry(data)
}

// Any own entry, today's or older. One that no longer exists throws NotFoundError.
export async function deleteWeightEntry(id: string) {
  const { data, error } = await supabase.from('weight_entries').delete().eq('id', id).select('id')
  if (error) throw error
  requireRows(data)
}
