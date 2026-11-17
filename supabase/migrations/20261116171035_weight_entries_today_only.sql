-- Weight entries are for today only (see docs/decisions.md, Weight module).
-- The database decides the day: Lisbon's calendar day when the request
-- arrives. The app sends only the weight and cannot write entry_date, and only
-- today's entry can be inserted or updated. Any entry can still be deleted.

-- now() is an absolute instant (the start of the transaction). "at time zone"
-- turns it into Lisbon's wall-clock time, summer time included, whatever the
-- session's time zone, and ::date keeps the day. A default may use now(),
-- unlike a check constraint, which PostgreSQL assumes always gives the same
-- result.
alter table public.weight_entries
  alter column entry_date set default ((now() at time zone 'Europe/Lisbon')::date);

-- One decimal at most. A check refuses 78.45 instead of rounding it silently,
-- as changing the type to numeric(4,1) would.
alter table public.weight_entries
  add constraint weight_entries_weight_kg_one_decimal check (weight_kg = round(weight_kg, 1));

-- The app may only write weight_kg. entry_date always comes from the default
-- above, so no request can choose another day, and an entry's day never
-- changes. Insert (weight_kg) and update (weight_kg) stay granted.
revoke insert (entry_date), update (entry_date) on table public.weight_entries from authenticated;

-- A second barrier behind the grants: inserts and updates only on today's
-- entry. An update to an older entry finds no row (0 rows, no error). The
-- upsert's DO UPDATE passes too, since the row it meets is today's. The
-- (select ...) wrappers make PostgreSQL evaluate each value once per statement.
alter policy "weight_entries_insert_own" on public.weight_entries
  with check (
    (select auth.uid()) = user_id
    and entry_date = (select (now() at time zone 'Europe/Lisbon')::date)
  );

alter policy "weight_entries_update_own" on public.weight_entries
  using (
    (select auth.uid()) = user_id
    and entry_date = (select (now() at time zone 'Europe/Lisbon')::date)
  )
  with check (
    (select auth.uid()) = user_id
    and entry_date = (select (now() at time zone 'Europe/Lisbon')::date)
  );

-- select and delete are unchanged: every own entry can be read and deleted.
