-- Daily body weight log: one entry per user and day (see docs/decisions.md, Data).

create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entry_date date not null,
  -- numeric, never floating point. The tighter range for real use is checked
  -- by the form; this only rejects impossible values.
  weight_kg numeric(5, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weight_entries_weight_kg_range check (weight_kg > 0 and weight_kg <= 500),
  -- A second entry on the same day replaces the first (upsert). The index
  -- behind this constraint also serves the RLS filter and ordering by date.
  constraint weight_entries_one_per_day unique (user_id, entry_date)
);

-- Keeps updated_at current when an entry is replaced. The empty search_path
-- stops the function from resolving names through other schemas.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;

create trigger weight_entries_set_updated_at
before update on public.weight_entries
for each row execute function public.set_updated_at();

-- Explicit even though automatic RLS is on, so the migration is safe on any project.
alter table public.weight_entries enable row level security;

-- New tables give anon and authenticated TRUNCATE, TRIGGER and MAINTAIN by
-- default, and TRUNCATE ignores RLS. Start from nothing and grant only what the
-- app needs. Nothing for anon. Inserts and updates may only write entry_date and
-- weight_kg: id, user_id and the timestamps always come from the database, and
-- user_id cannot be set to another user or changed later. Omitted columns take
-- their defaults without needing a privilege, so an upsert without user_id works.
revoke all on table public.weight_entries from anon, authenticated;
grant select, delete on table public.weight_entries to authenticated;
grant insert (entry_date, weight_kg), update (entry_date, weight_kg) on table public.weight_entries to authenticated;

-- One policy per operation, for signed-in users only. (select auth.uid()) is
-- evaluated once per statement instead of once per row.
create policy "weight_entries_select_own" on public.weight_entries
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "weight_entries_insert_own" on public.weight_entries
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "weight_entries_update_own" on public.weight_entries
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "weight_entries_delete_own" on public.weight_entries
  for delete to authenticated
  using ((select auth.uid()) = user_id);
