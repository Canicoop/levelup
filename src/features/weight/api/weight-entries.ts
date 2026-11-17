import { dayChanged, toWeightEntry, type WeightEntry } from '@/features/weight/lib/entries'
import { DayChangedError } from '@/features/weight/lib/errors'
import type { DayKey } from '@/features/weight/lib/lisbon-day'
import { toKg, type Tenths } from '@/features/weight/lib/weight-values'
import { requireRows } from '@/features/workout/lib/errors'
import { supabase } from '@/lib/supabase'

const COLUMNS = 'id, entry_date, weight_kg'

// The Data API's row limit (Supabase's default "Max rows"). A full page means
// there may be more.
const PAGE_SIZE = 1000

// What the app may write: the weight only. The generated Insert type also
// allows entry_date, user_id and id, which the database refuses (see
// docs/decisions.md, Privileges and RLS).
type WeightEntryWrite = { weight_kg: number }

// Every entry of the user, newest first. Read in pages, so "Tudo" keeps the
// oldest entries once there are more than a page (about three years of daily
// weighing). Entries are unique per day, so the order is stable across pages.
export async function fetchWeightEntries(): Promise<WeightEntry[]> {
  const entries: WeightEntry[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('weight_entries')
      .select(COLUMNS)
      .order('entry_date', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    entries.push(...data.map(toWeightEntry))
    if (data.length < PAGE_SIZE) return entries
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
