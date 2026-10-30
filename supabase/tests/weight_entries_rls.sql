-- Security tests for public.weight_entries: privileges, RLS policies and constraints.
--
-- How to run: paste the whole file into the SQL Editor of levelup-dev and run it.
-- Everything happens inside one transaction that is never committed, so nothing
-- is kept: neither the two fake users nor their entries. A failed check raises
-- an exception whose message starts with "FAIL", which aborts the transaction.
-- The last result is "All weight_entries checks passed" when everything holds.
--
-- This is plain SQL, not pgTAP: it needs no Docker and is not meant for
-- `supabase test db`.
--
-- Fake users (exist only inside this transaction):
--   A = aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
--   B = bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb
--
-- Users are simulated the way the Data API does it: a database role (anon or
-- authenticated) plus the JWT claims that auth.uid() reads.

begin;

insert into auth.users (id, aud, role, email)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'rls-test-a@example.invalid'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'rls-test-b@example.invalid');

-- ---------------------------------------------------------------------------
-- 1. Without a session (anon): no access at all.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

do $$
begin
  perform 1 from public.weight_entries;
  raise exception 'FAIL 1.1: anon could select';
exception when insufficient_privilege then null;
end $$;

do $$
begin
  insert into public.weight_entries (entry_date, weight_kg) values ('2026-01-01', 80);
  raise exception 'FAIL 1.2: anon could insert';
exception when insufficient_privilege then null;
end $$;

do $$
begin
  update public.weight_entries set weight_kg = 1;
  raise exception 'FAIL 1.3: anon could update';
exception when insufficient_privilege then null;
end $$;

do $$
begin
  delete from public.weight_entries;
  raise exception 'FAIL 1.4: anon could delete';
exception when insufficient_privilege then null;
end $$;

do $$
begin
  truncate public.weight_entries;
  raise exception 'FAIL 1.5: anon could truncate';
exception when insufficient_privilege then null;
end $$;

-- ---------------------------------------------------------------------------
-- 2. User B creates one entry. Its id is kept in a transaction-local setting
--    so that A can try to reach it later.
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  entry public.weight_entries;
begin
  insert into public.weight_entries (entry_date, weight_kg)
  values ('2026-01-01', 80)
  returning * into entry;

  if entry.user_id is distinct from 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' then
    raise exception 'FAIL 2.1: B''s entry got user_id %', entry.user_id;
  end if;
  perform set_config('test.b_entry_id', entry.id::text, true);
end $$;

-- ---------------------------------------------------------------------------
-- 3. User A: own entries only.
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);
set local role authenticated;

-- 3.1 Insert without user_id: the database sets it to A.
do $$
declare
  entry public.weight_entries;
begin
  insert into public.weight_entries (entry_date, weight_kg)
  values ('2026-01-02', 70)
  returning * into entry;

  if entry.user_id is distinct from 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' then
    raise exception 'FAIL 3.1: A''s entry got user_id %', entry.user_id;
  end if;
  perform set_config('test.a_entry_id', entry.id::text, true);
end $$;

-- 3.2 Insert with B's user_id: user_id is not in the insert grant.
do $$
begin
  insert into public.weight_entries (user_id, entry_date, weight_kg)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-01-03', 70);
  raise exception 'FAIL 3.2: A inserted an entry with B''s user_id';
exception when insufficient_privilege then null;
end $$;

-- 3.3 Insert with a chosen id: id is not in the insert grant.
do $$
begin
  insert into public.weight_entries (id, entry_date, weight_kg)
  values (gen_random_uuid(), '2026-01-03', 70);
  raise exception 'FAIL 3.3: A inserted an entry with a chosen id';
exception when insufficient_privilege then null;
end $$;

-- 3.4 Select: A sees only A's entry, and not B's even by id.
do $$
declare
  visible integer;
  others integer;
begin
  select count(*), count(*) filter (where user_id <> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
  into visible, others
  from public.weight_entries;

  if visible <> 1 or others <> 0 then
    raise exception 'FAIL 3.4: A sees % entries, % of them not A''s', visible, others;
  end if;

  if exists (
    select 1 from public.weight_entries
    where id = current_setting('test.b_entry_id')::uuid
  ) then
    raise exception 'FAIL 3.4: A can read B''s entry by id';
  end if;
end $$;

-- 3.5 Update own entry: allowed.
do $$
declare
  changed integer;
begin
  update public.weight_entries set weight_kg = 70.5
  where id = current_setting('test.a_entry_id')::uuid;
  get diagnostics changed = row_count;

  if changed <> 1 then
    raise exception 'FAIL 3.5: updating A''s own entry changed % rows', changed;
  end if;
end $$;

-- 3.6 Update B's entry: RLS hides it, so nothing changes.
do $$
declare
  changed integer;
begin
  update public.weight_entries set weight_kg = 1
  where id = current_setting('test.b_entry_id')::uuid;
  get diagnostics changed = row_count;

  if changed <> 0 then
    raise exception 'FAIL 3.6: A updated % of B''s entries', changed;
  end if;
end $$;

-- 3.7 Change user_id on own entry: user_id is not in the update grant.
do $$
begin
  update public.weight_entries
  set user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  where id = current_setting('test.a_entry_id')::uuid;
  raise exception 'FAIL 3.7: A changed the user_id of an entry';
exception when insufficient_privilege then null;
end $$;

-- 3.8 Upsert for the same day, without user_id: replaces the weight, keeps
--     the row and its user_id, and refreshes updated_at. now() is fixed for
--     the whole transaction, so updated_at is first moved back as postgres
--     (the table owner, which RLS does not apply to) to see the trigger work.
--     The trigger is disabled for that update, or it would set now() again.
--     Disabling it locks the table until the rollback; this is the dev project.
reset role;
alter table public.weight_entries disable trigger weight_entries_set_updated_at;
update public.weight_entries
set updated_at = '2000-01-01T00:00:00Z'
where id = current_setting('test.a_entry_id')::uuid;
alter table public.weight_entries enable trigger weight_entries_set_updated_at;

do $$
begin
  if not exists (
    select 1 from public.weight_entries
    where id = current_setting('test.a_entry_id')::uuid
      and updated_at = '2000-01-01T00:00:00Z'
  ) then
    raise exception 'FAIL 3.8a: updated_at was not moved back to 2000-01-01';
  end if;
end $$;

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  entry public.weight_entries;
  same_day integer;
begin
  insert into public.weight_entries (entry_date, weight_kg)
  values ('2026-01-02', 71.5)
  on conflict (user_id, entry_date) do update set weight_kg = excluded.weight_kg
  returning * into entry;

  if entry.id is distinct from current_setting('test.a_entry_id')::uuid then
    raise exception 'FAIL 3.8: the upsert created a new row instead of replacing the entry';
  end if;
  if entry.weight_kg <> 71.5 then
    raise exception 'FAIL 3.8: the upsert left weight_kg at %', entry.weight_kg;
  end if;
  if entry.user_id is distinct from 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' then
    raise exception 'FAIL 3.8: the upsert changed user_id to %', entry.user_id;
  end if;
  if entry.updated_at <= '2000-01-01T00:00:00Z' then
    raise exception 'FAIL 3.8: the upsert did not refresh updated_at';
  end if;

  select count(*) into same_day
  from public.weight_entries
  where entry_date = '2026-01-02';
  if same_day <> 1 then
    raise exception 'FAIL 3.8: A has % entries on the same day', same_day;
  end if;
end $$;

-- 3.9 A plain second insert for the same day: one entry per day.
do $$
begin
  insert into public.weight_entries (entry_date, weight_kg) values ('2026-01-02', 72);
  raise exception 'FAIL 3.9: A inserted a second entry for the same day';
exception when unique_violation then null;
end $$;

-- 3.10 Impossible weights: rejected by the check constraint.
do $$
begin
  insert into public.weight_entries (entry_date, weight_kg) values ('2026-01-04', 0);
  raise exception 'FAIL 3.10: a weight of 0 was accepted';
exception when check_violation then null;
end $$;

do $$
begin
  insert into public.weight_entries (entry_date, weight_kg) values ('2026-01-05', 600);
  raise exception 'FAIL 3.10: a weight of 600 was accepted';
exception when check_violation then null;
end $$;

-- 3.11 Delete B's entry: RLS hides it, so nothing is deleted.
do $$
declare
  removed integer;
begin
  delete from public.weight_entries
  where id = current_setting('test.b_entry_id')::uuid;
  get diagnostics removed = row_count;

  if removed <> 0 then
    raise exception 'FAIL 3.11: A deleted % of B''s entries', removed;
  end if;
end $$;

-- 3.12 Truncate: not granted (it would bypass RLS).
do $$
begin
  truncate public.weight_entries;
  raise exception 'FAIL 3.12: authenticated could truncate';
exception when insufficient_privilege then null;
end $$;

-- 3.13 Delete own entry: allowed.
do $$
declare
  removed integer;
begin
  delete from public.weight_entries
  where id = current_setting('test.a_entry_id')::uuid;
  get diagnostics removed = row_count;

  if removed <> 1 then
    raise exception 'FAIL 3.13: deleting A''s own entry removed % rows', removed;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. User B: the entry is untouched by everything A tried.
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  entry public.weight_entries;
  total integer;
begin
  select count(*) into total from public.weight_entries;
  select * into entry from public.weight_entries
  where id = current_setting('test.b_entry_id')::uuid;

  if total <> 1 or entry.id is null or entry.weight_kg <> 80 then
    raise exception 'FAIL 4.1: B''s entry changed (B sees % entries, weight %)', total, entry.weight_kg;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Nothing is kept.
-- ---------------------------------------------------------------------------
reset role;
rollback;

select 'All weight_entries checks passed' as result;
