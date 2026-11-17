-- Security tests for public.weight_entries: privileges, RLS policies and constraints.
--
-- How to run: paste the whole file into the SQL Editor and run it, on
-- levelup-dev first. Everything happens inside one transaction that is never
-- committed, so nothing is kept: neither the two fake users nor their entries,
-- nor the grant that check 3.17 adds for a moment. A failed check raises an
-- exception whose message starts with "FAIL", which aborts the transaction.
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
--
-- "Today" is Lisbon's calendar day (see docs/decisions.md, Weight module). The
-- app can only log today's weight, so older entries are created as postgres,
-- the table owner, which RLS does not apply to.

begin;

insert into auth.users (id, aud, role, email)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'rls-test-a@example.invalid'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'rls-test-b@example.invalid');

-- ---------------------------------------------------------------------------
-- 0. Setup, as postgres.
-- ---------------------------------------------------------------------------
-- Lisbon's day, worked out without the column's expression: now() is fixed for
-- the whole transaction, and cast to a date in a session set to Lisbon it gives
-- Lisbon's day. The rest of the file runs in UTC, Supabase's default.
set local timezone to 'Europe/Lisbon';
select set_config('test.today', now()::date::text, true);
set local timezone to 'UTC';

-- One older entry for each user, a month ago.
do $$
declare
  a_past uuid;
  b_past uuid;
begin
  insert into public.weight_entries (user_id, entry_date, weight_kg)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', current_setting('test.today')::date - 30, 70)
  returning id into a_past;

  insert into public.weight_entries (user_id, entry_date, weight_kg)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', current_setting('test.today')::date - 31, 80)
  returning id into b_past;

  perform set_config('test.a_past_id', a_past::text, true);
  perform set_config('test.b_past_id', b_past::text, true);
end $$;

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
  insert into public.weight_entries (weight_kg) values (80);
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
-- 2. User B logs today's weight. Its id is kept in a transaction-local
--    setting so that A can try to reach it later.
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  entry public.weight_entries;
begin
  insert into public.weight_entries (weight_kg)
  values (80.5)
  returning * into entry;

  if entry.user_id is distinct from 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' then
    raise exception 'FAIL 2.1: B''s entry got user_id %', entry.user_id;
  end if;
  if entry.entry_date is distinct from current_setting('test.today')::date then
    raise exception 'FAIL 2.2: B''s entry got the day %, not Lisbon''s %', entry.entry_date, current_setting('test.today');
  end if;
  perform set_config('test.b_today_id', entry.id::text, true);
end $$;

-- ---------------------------------------------------------------------------
-- 3. User A.
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);
set local role authenticated;

-- 3.1 Insert with the weight only: the database sets user_id to A and the day
--     to Lisbon's today.
do $$
declare
  entry public.weight_entries;
begin
  insert into public.weight_entries (weight_kg)
  values (70)
  returning * into entry;

  if entry.user_id is distinct from 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' then
    raise exception 'FAIL 3.1: A''s entry got user_id %', entry.user_id;
  end if;
  if entry.entry_date is distinct from current_setting('test.today')::date then
    raise exception 'FAIL 3.1: A''s entry got the day %, not Lisbon''s %', entry.entry_date, current_setting('test.today');
  end if;
  perform set_config('test.a_today_id', entry.id::text, true);
end $$;

-- 3.2 Insert with B's user_id: user_id is not in the insert grant.
do $$
begin
  insert into public.weight_entries (user_id, weight_kg)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 70);
  raise exception 'FAIL 3.2: A inserted an entry with B''s user_id';
exception when insufficient_privilege then null;
end $$;

-- 3.3 Insert with a chosen id: id is not in the insert grant.
do $$
begin
  insert into public.weight_entries (id, weight_kg)
  values (gen_random_uuid(), 70);
  raise exception 'FAIL 3.3: A inserted an entry with a chosen id';
exception when insufficient_privilege then null;
end $$;

-- 3.4 Insert with a chosen day, past or even today: entry_date is not in the
--     insert grant. The message tells a missing privilege from the policy.
do $$
begin
  insert into public.weight_entries (entry_date, weight_kg)
  values (current_setting('test.today')::date - 1, 70);
  raise exception 'FAIL 3.4: A inserted an entry for yesterday';
exception when insufficient_privilege then
  if sqlerrm not like 'permission denied%' then
    raise exception 'FAIL 3.4: refused for another reason: %', sqlerrm;
  end if;
end $$;

do $$
begin
  insert into public.weight_entries (entry_date, weight_kg)
  values (current_setting('test.today')::date, 70);
  raise exception 'FAIL 3.4: A inserted an entry with a chosen entry_date';
exception when insufficient_privilege then
  if sqlerrm not like 'permission denied%' then
    raise exception 'FAIL 3.4: refused for another reason: %', sqlerrm;
  end if;
end $$;

-- 3.5 Select: A sees A's two entries (a month ago and today), every day, and
--     none of B's, even by id.
do $$
declare
  visible integer;
  others integer;
begin
  select count(*), count(*) filter (where user_id <> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
  into visible, others
  from public.weight_entries;

  if visible <> 2 or others <> 0 then
    raise exception 'FAIL 3.5: A sees % entries, % of them not A''s', visible, others;
  end if;

  if exists (
    select 1 from public.weight_entries
    where id in (current_setting('test.b_today_id')::uuid, current_setting('test.b_past_id')::uuid)
  ) then
    raise exception 'FAIL 3.5: A can read B''s entries by id';
  end if;
end $$;

-- 3.6 Update today's own entry: allowed.
do $$
declare
  changed integer;
begin
  update public.weight_entries set weight_kg = 70.5
  where id = current_setting('test.a_today_id')::uuid;
  get diagnostics changed = row_count;

  if changed <> 1 then
    raise exception 'FAIL 3.6: updating A''s entry of today changed % rows', changed;
  end if;
end $$;

-- 3.7 Update an older own entry: the policy hides it from updates, so nothing
--     changes, and the weight stays as it was.
do $$
declare
  changed integer;
  kept numeric;
begin
  update public.weight_entries set weight_kg = 99
  where id = current_setting('test.a_past_id')::uuid;
  get diagnostics changed = row_count;

  if changed <> 0 then
    raise exception 'FAIL 3.7: A updated % of A''s older entries', changed;
  end if;

  select weight_kg into kept from public.weight_entries
  where id = current_setting('test.a_past_id')::uuid;
  if kept is distinct from 70 then
    raise exception 'FAIL 3.7: A''s older entry is now %', kept;
  end if;
end $$;

-- 3.8 Update B's entry of today: RLS hides it, so nothing changes.
do $$
declare
  changed integer;
begin
  update public.weight_entries set weight_kg = 1
  where id = current_setting('test.b_today_id')::uuid;
  get diagnostics changed = row_count;

  if changed <> 0 then
    raise exception 'FAIL 3.8: A updated % of B''s entries', changed;
  end if;
end $$;

-- 3.9 Move today's own entry to another day: entry_date is not in the update grant.
do $$
begin
  update public.weight_entries
  set entry_date = current_setting('test.today')::date - 1
  where id = current_setting('test.a_today_id')::uuid;
  raise exception 'FAIL 3.9: A changed the day of an entry';
exception when insufficient_privilege then
  if sqlerrm not like 'permission denied%' then
    raise exception 'FAIL 3.9: refused for another reason: %', sqlerrm;
  end if;
end $$;

-- 3.10 Change user_id on own entry: user_id is not in the update grant.
do $$
begin
  update public.weight_entries
  set user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  where id = current_setting('test.a_today_id')::uuid;
  raise exception 'FAIL 3.10: A changed the user_id of an entry';
exception when insufficient_privilege then null;
end $$;

-- 3.11 Upsert with the weight only, as the app sends it: replaces today's
--      weight, keeps the row and its user_id, and refreshes updated_at. now()
--      is fixed for the whole transaction, so updated_at is first moved back as
--      postgres (the table owner, which RLS does not apply to) to see the
--      trigger work. The trigger is disabled for that update, or it would set
--      now() again. Disabling it locks the table until the rollback.
reset role;
alter table public.weight_entries disable trigger weight_entries_set_updated_at;
update public.weight_entries
set updated_at = '2000-01-01T00:00:00Z'
where id = current_setting('test.a_today_id')::uuid;
alter table public.weight_entries enable trigger weight_entries_set_updated_at;

do $$
begin
  if not exists (
    select 1 from public.weight_entries
    where id = current_setting('test.a_today_id')::uuid
      and updated_at = '2000-01-01T00:00:00Z'
  ) then
    raise exception 'FAIL 3.11a: updated_at was not moved back to 2000-01-01';
  end if;
end $$;

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  entry public.weight_entries;
  today_entries integer;
begin
  insert into public.weight_entries (weight_kg)
  values (71.5)
  on conflict (user_id, entry_date) do update set weight_kg = excluded.weight_kg
  returning * into entry;

  if entry.id is distinct from current_setting('test.a_today_id')::uuid then
    raise exception 'FAIL 3.11: the upsert created a new row instead of replacing today''s entry';
  end if;
  if entry.weight_kg <> 71.5 then
    raise exception 'FAIL 3.11: the upsert left weight_kg at %', entry.weight_kg;
  end if;
  if entry.user_id is distinct from 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' then
    raise exception 'FAIL 3.11: the upsert changed user_id to %', entry.user_id;
  end if;
  if entry.updated_at <= '2000-01-01T00:00:00Z' then
    raise exception 'FAIL 3.11: the upsert did not refresh updated_at';
  end if;

  select count(*) into today_entries
  from public.weight_entries
  where entry_date = current_setting('test.today')::date;
  if today_entries <> 1 then
    raise exception 'FAIL 3.11: A has % entries today', today_entries;
  end if;
end $$;

-- 3.12 A plain second insert today: one entry per day.
do $$
begin
  insert into public.weight_entries (weight_kg) values (72);
  raise exception 'FAIL 3.12: A inserted a second entry today';
exception when unique_violation then null;
end $$;

-- 3.13 The session's time zone does not change the day. Kiritimati (UTC+14)
--      and Pago Pago (UTC-11) are 25 hours apart, so their dates always
--      differ, and at any hour at least one of them differs from Lisbon's.
--      Today's entry is deleted and logged again in each. An insert that
--      succeeds also shows the insert policy agrees with the default.
do $$
begin
  delete from public.weight_entries where id = current_setting('test.a_today_id')::uuid;
end $$;

set local timezone to 'Pacific/Kiritimati';

do $$
declare
  entry public.weight_entries;
begin
  insert into public.weight_entries (weight_kg) values (72) returning * into entry;
  if entry.entry_date is distinct from current_setting('test.today')::date then
    raise exception 'FAIL 3.13: in Kiritimati''s time zone the day was %, not Lisbon''s %', entry.entry_date, current_setting('test.today');
  end if;
  delete from public.weight_entries where id = entry.id;
end $$;

set local timezone to 'Pacific/Pago_Pago';

do $$
declare
  entry public.weight_entries;
begin
  insert into public.weight_entries (weight_kg) values (72) returning * into entry;
  if entry.entry_date is distinct from current_setting('test.today')::date then
    raise exception 'FAIL 3.13: in Pago Pago''s time zone the day was %, not Lisbon''s %', entry.entry_date, current_setting('test.today');
  end if;
  perform set_config('test.a_today_id', entry.id::text, true);
end $$;

set local timezone to 'UTC';

-- 3.14 Weights: impossible values and more than one decimal are refused by
--      their check constraints, through the upsert the app uses; one decimal
--      is accepted.
do $$
declare
  failed text;
begin
  insert into public.weight_entries (weight_kg) values (0)
  on conflict (user_id, entry_date) do update set weight_kg = excluded.weight_kg;
  raise exception 'FAIL 3.14: a weight of 0 was accepted';
exception when check_violation then
  get stacked diagnostics failed = constraint_name;
  if failed <> 'weight_entries_weight_kg_range' then
    raise exception 'FAIL 3.14: 0 was refused by % instead of the range', failed;
  end if;
end $$;

do $$
declare
  failed text;
begin
  insert into public.weight_entries (weight_kg) values (600)
  on conflict (user_id, entry_date) do update set weight_kg = excluded.weight_kg;
  raise exception 'FAIL 3.14: a weight of 600 was accepted';
exception when check_violation then
  get stacked diagnostics failed = constraint_name;
  if failed <> 'weight_entries_weight_kg_range' then
    raise exception 'FAIL 3.14: 600 was refused by % instead of the range', failed;
  end if;
end $$;

do $$
declare
  failed text;
begin
  insert into public.weight_entries (weight_kg) values (78.45)
  on conflict (user_id, entry_date) do update set weight_kg = excluded.weight_kg;
  raise exception 'FAIL 3.14: a weight with two decimals (78.45) was accepted';
exception when check_violation then
  get stacked diagnostics failed = constraint_name;
  if failed <> 'weight_entries_weight_kg_one_decimal' then
    raise exception 'FAIL 3.14: 78.45 was refused by % instead of the one-decimal check', failed;
  end if;
end $$;

do $$
declare
  entry public.weight_entries;
begin
  insert into public.weight_entries (weight_kg) values (78.4)
  on conflict (user_id, entry_date) do update set weight_kg = excluded.weight_kg
  returning * into entry;
  if entry.weight_kg <> 78.4 then
    raise exception 'FAIL 3.14: 78.4 was stored as %', entry.weight_kg;
  end if;
end $$;

-- 3.15 Delete B's entries: RLS hides them, so nothing is deleted.
do $$
declare
  removed integer;
begin
  delete from public.weight_entries
  where id in (current_setting('test.b_today_id')::uuid, current_setting('test.b_past_id')::uuid);
  get diagnostics removed = row_count;

  if removed <> 0 then
    raise exception 'FAIL 3.15: A deleted % of B''s entries', removed;
  end if;
end $$;

-- 3.16 Truncate: not granted (it would bypass RLS).
do $$
begin
  truncate public.weight_entries;
  raise exception 'FAIL 3.16: authenticated could truncate';
exception when insufficient_privilege then null;
end $$;

-- 3.17 The policies are a second barrier: even with entry_date granted (for a
--      moment, as postgres), A cannot log another day or move today's entry.
--      Both fail on the policy, whose message names row-level security.
reset role;
grant insert (entry_date), update (entry_date) on table public.weight_entries to authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  insert into public.weight_entries (entry_date, weight_kg)
  values (current_setting('test.today')::date + 1, 70);
  raise exception 'FAIL 3.17: with the grant, A logged tomorrow''s weight';
exception when insufficient_privilege then
  if sqlerrm not like '%row-level security%' then
    raise exception 'FAIL 3.17: refused for another reason: %', sqlerrm;
  end if;
end $$;

do $$
begin
  update public.weight_entries
  set entry_date = current_setting('test.today')::date - 1
  where id = current_setting('test.a_today_id')::uuid;
  raise exception 'FAIL 3.17: with the grant, A moved today''s entry to yesterday';
exception when insufficient_privilege then
  if sqlerrm not like '%row-level security%' then
    raise exception 'FAIL 3.17: refused for another reason: %', sqlerrm;
  end if;
end $$;

reset role;
revoke insert (entry_date), update (entry_date) on table public.weight_entries from authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);
set local role authenticated;

-- 3.18 Delete an older own entry: allowed (any entry can be deleted).
do $$
declare
  removed integer;
begin
  delete from public.weight_entries
  where id = current_setting('test.a_past_id')::uuid;
  get diagnostics removed = row_count;

  if removed <> 1 then
    raise exception 'FAIL 3.18: deleting A''s older entry removed % rows', removed;
  end if;
end $$;

-- 3.19 Delete today's own entry: allowed.
do $$
declare
  removed integer;
begin
  delete from public.weight_entries
  where id = current_setting('test.a_today_id')::uuid;
  get diagnostics removed = row_count;

  if removed <> 1 then
    raise exception 'FAIL 3.19: deleting A''s entry of today removed % rows', removed;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. User B: both entries are untouched by everything A tried.
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  total integer;
  today_weight numeric;
  past_weight numeric;
begin
  select count(*) into total from public.weight_entries;
  select weight_kg into today_weight from public.weight_entries
  where id = current_setting('test.b_today_id')::uuid;
  select weight_kg into past_weight from public.weight_entries
  where id = current_setting('test.b_past_id')::uuid;

  if total <> 2 or today_weight is distinct from 80.5 or past_weight is distinct from 80 then
    raise exception 'FAIL 4.1: B''s entries changed (B sees % entries, today %, a month ago %)', total, today_weight, past_weight;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Nothing is kept.
-- ---------------------------------------------------------------------------
reset role;
rollback;

select 'All weight_entries checks passed' as result;
