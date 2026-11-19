-- Security tests for the finance tables and set_budget: privileges, RLS,
-- composite foreign keys (including the category's kind), constraints, the
-- days and months decided by the database, deleting categories in use, and
-- cascades.
--
-- How to run: paste the whole file into the SQL Editor of levelup-dev and run it.
-- Everything happens inside one transaction that is never committed, so nothing
-- is kept: neither the two fake users nor their data. A failed check raises an
-- exception whose message starts with "FAIL", which aborts the transaction.
-- The last result is "All finance checks passed" when everything holds.
--
-- This is plain SQL, not pgTAP: it needs no Docker and is not meant for
-- `supabase test db`.
--
-- Fake users (exist only inside this transaction):
--   A = aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
--   B = bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb
--
-- Users are simulated the way the Data API does it: a database role (anon or
-- authenticated) plus the JWT claims that auth.uid() reads. Ids created during
-- the run are kept in transaction-local settings (test.*).
--
-- Error cases are listed as (label, statement, expected SQLSTATE) and run one by
-- one, each in its own subtransaction: anything a statement wrote is undone
-- before the next one. A statement that succeeds, or fails with another code,
-- is a FAIL. Codes: 42501 privilege or row-level security policy, 23503 foreign
-- key, 23505 unique, 23514 check.
--
-- Limit: now() is fixed inside the transaction, so midnight, a new month and
-- the order of transactions logged on the same day (created_at) cannot be
-- simulated here. The app's side of them is left to Vitest.

begin;

insert into auth.users (id, aud, role, email)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'finance-test-a@example.invalid'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'finance-test-b@example.invalid');

-- ---------------------------------------------------------------------------
-- 1. Without a session (anon): no access to any table or to set_budget.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

do $$
declare
  t text;
  stmt text;
begin
  foreach t in array array['categories', 'transactions', 'budgets', 'subscriptions'] loop
    foreach stmt in array array[
      format('select 1 from public.%I limit 1', t),
      format('insert into public.%I default values', t),
      format('update public.%I set created_at = created_at', t),
      format('delete from public.%I', t),
      format('truncate public.%I', t)
    ] loop
      begin
        execute stmt;
        raise exception 'FAIL 1.1: anon could run: %', stmt;
      exception when insufficient_privilege then null;
      end;
    end loop;
  end loop;
end $$;

do $$
begin
  perform public.set_budget(null, 100);
  raise exception 'FAIL 1.2: anon could execute set_budget';
exception when insufficient_privilege then null;
end $$;

-- ---------------------------------------------------------------------------
-- 2. User B: two categories, two transactions, two budgets and a subscription.
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true);
set local role authenticated;

-- Variables are prefixed with b_ so they never collide with column names.
do $$
declare
  b_home uuid;
  b_salary uuid;
  b_transaction uuid;
  b_subscription uuid;
begin
  insert into public.categories (kind, name) values ('expense', 'Casa') returning id into b_home;
  insert into public.categories (kind, name) values ('income', 'Salário') returning id into b_salary;

  insert into public.transactions (kind, category_id, amount)
  values ('expense', b_home, '650.00')
  returning id into b_transaction;
  insert into public.transactions (kind, category_id, amount) values ('income', b_salary, '1800.00');

  perform public.set_budget(null, 1000);
  perform public.set_budget(b_home, 700);

  insert into public.subscriptions (name, amount, interval_months, reference_date, category_id)
  values ('Internet', '30.00', 1, '2026-11-05', b_home)
  returning id into b_subscription;

  perform set_config('test.b_home', b_home::text, true);
  perform set_config('test.b_salary', b_salary::text, true);
  perform set_config('test.b_transaction', b_transaction::text, true);
  perform set_config('test.b_subscription', b_subscription::text, true);
end $$;

-- ---------------------------------------------------------------------------
-- 3. User A.
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);
set local role authenticated;

-- 3.1 A's categories (the same name as B's is fine: names are unique per
--     user; the same name in the other kind is fine too), transactions and
--     subscriptions. The day is Lisbon's today, worked out here without the
--     column's expression (current_date in a session set to Lisbon), and the
--     session's time zone does not change it: Pacific/Kiritimati and
--     Pacific/Pago_Pago never share a date.
do $$
declare
  a_food public.categories;
  a_home uuid;
  a_fun uuid;
  a_unused uuid;
  a_salary uuid;
  a_transaction public.transactions;
  a_subscription_kept uuid;
  a_subscription_deleted uuid;
  lisbon_today date;
  month_start date;
  other_day date;
  stored_amount text;
begin
  perform set_config('TimeZone', 'Europe/Lisbon', true);
  lisbon_today := current_date;
  month_start := date_trunc('month', current_date)::date;

  insert into public.categories (kind, name) values ('expense', 'Alimentação') returning * into a_food;
  if a_food.user_id is distinct from 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' or a_food.archived_at is not null then
    raise exception 'FAIL 3.1: A''s category got user_id % and archived_at %', a_food.user_id, a_food.archived_at;
  end if;
  insert into public.categories (kind, name) values ('expense', 'Casa') returning id into a_home;
  insert into public.categories (kind, name) values ('expense', 'Lazer') returning id into a_fun;
  insert into public.categories (kind, name) values ('expense', 'Educação') returning id into a_unused;
  insert into public.categories (kind, name) values ('income', 'Salário') returning id into a_salary;
  insert into public.categories (kind, name) values ('expense', 'Outros'), ('income', 'Outros');

  -- Logged in a session set to Kiritimati: still Lisbon's today. 12.5 is
  -- stored and read back as text with two decimals.
  perform set_config('TimeZone', 'Pacific/Kiritimati', true);
  insert into public.transactions (kind, category_id, amount, merchant, note)
  values ('expense', a_food.id, '12.5', 'Pingo Doce', 'Jantar')
  returning * into a_transaction;
  if a_transaction.user_id is distinct from 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    or a_transaction.occurred_on is distinct from lisbon_today
    or a_transaction.amount::text is distinct from '12.50'
    or a_transaction.merchant is distinct from 'Pingo Doce'
    or a_transaction.note is distinct from 'Jantar' then
    raise exception 'FAIL 3.1: A''s transaction was stored as %', a_transaction;
  end if;

  perform set_config('TimeZone', 'Pacific/Pago_Pago', true);
  insert into public.transactions (kind, category_id, amount)
  values ('income', a_salary, '1500.00')
  returning occurred_on into other_day;
  if other_day is distinct from lisbon_today then
    raise exception 'FAIL 3.1: in Pago Pago the day was % instead of %', other_day, lisbon_today;
  end if;
  perform set_config('TimeZone', 'UTC', true);

  -- An earlier day can be chosen.
  insert into public.transactions (kind, category_id, amount, occurred_on)
  values ('expense', a_food.id, '8.90', lisbon_today - 1)
  returning occurred_on into other_day;
  if other_day is distinct from lisbon_today - 1 then
    raise exception 'FAIL 3.1: yesterday''s transaction was stored on %', other_day;
  end if;

  -- Accepted (docs/decisions.md): numeric(12, 2) rounds a third decimal.
  insert into public.transactions (kind, category_id, amount)
  values ('expense', a_food.id, '12.345')
  returning amount::text into stored_amount;
  if stored_amount is distinct from '12.35' then
    raise exception 'FAIL 3.1: 12.345 was stored as %', stored_amount;
  end if;

  insert into public.subscriptions (name, amount, interval_months, reference_date, category_id)
  values ('Spotify', '10.99', 1, '2026-10-31', a_fun)
  returning id into a_subscription_kept;
  insert into public.subscriptions (name, amount, interval_months, reference_date, category_id)
  values ('Revista', '45.00', 12, '2026-03-15', a_fun)
  returning id into a_subscription_deleted;
  -- Names may repeat.
  insert into public.subscriptions (name, amount, interval_months, reference_date, category_id)
  values ('Spotify', '10.99', 3, '2026-11-01', a_fun);

  perform set_config('test.a_food', a_food.id::text, true);
  perform set_config('test.a_home', a_home::text, true);
  perform set_config('test.a_fun', a_fun::text, true);
  perform set_config('test.a_unused', a_unused::text, true);
  perform set_config('test.a_salary', a_salary::text, true);
  perform set_config('test.a_transaction', a_transaction.id::text, true);
  perform set_config('test.a_subscription_kept', a_subscription_kept::text, true);
  perform set_config('test.a_subscription_deleted', a_subscription_deleted::text, true);
  perform set_config('test.lisbon_today', lisbon_today::text, true);
  perform set_config('test.month_start', month_start::text, true);
end $$;

-- 3.2–3.8 Error cases: names, limits, kinds, links to B's rows, future days,
--         forbidden columns and operations.
do $$
declare
  c record;
  got text;
begin
  for c in
    select * from (values
      -- 3.2 Category names are unique per user and kind, ignoring case;
      --     trimmed; 1 to 40 characters. The kind is expense or income.
      ('3.2 same name in lower case', $s$insert into public.categories (kind, name) values ('expense', 'casa')$s$, '23505'),
      ('3.2 same name in upper case', $s$insert into public.categories (kind, name) values ('expense', 'CASA')$s$, '23505'),
      ('3.2 leading space', $s$insert into public.categories (kind, name) values ('expense', ' Saúde')$s$, '23514'),
      ('3.2 trailing tab', $s$insert into public.categories (kind, name) values ('expense', 'Saúde' || chr(9))$s$, '23514'),
      ('3.2 empty name', $s$insert into public.categories (kind, name) values ('expense', '')$s$, '23514'),
      ('3.2 41 characters', $s$insert into public.categories (kind, name) values ('expense', repeat('x', 41))$s$, '23514'),
      ('3.2 unknown kind', $s$insert into public.categories (kind, name) values ('transfer', 'Saúde')$s$, '23514'),
      -- 3.3 Transactions: a category of the same user and kind.
      ('3.3 B''s category', $s$insert into public.transactions (kind, category_id, amount) values ('expense', current_setting('test.b_home')::uuid, 10)$s$, '23503'),
      ('3.3 expense with an income category', $s$insert into public.transactions (kind, category_id, amount) values ('expense', current_setting('test.a_salary')::uuid, 10)$s$, '23503'),
      ('3.3 income with an expense category', $s$insert into public.transactions (kind, category_id, amount) values ('income', current_setting('test.a_food')::uuid, 10)$s$, '23503'),
      ('3.3 change the kind but not the category', $s$update public.transactions set kind = 'income' where id = current_setting('test.a_transaction')::uuid$s$, '23503'),
      ('3.3 move to B''s category', $s$update public.transactions set category_id = current_setting('test.b_home')::uuid where id = current_setting('test.a_transaction')::uuid$s$, '23503'),
      -- 3.4 Transaction limits: amount above 0; merchant 1–80 and note 1–200
      --     characters, trimmed, or null.
      ('3.4 amount 0', $s$insert into public.transactions (kind, category_id, amount) values ('expense', current_setting('test.a_food')::uuid, 0)$s$, '23514'),
      ('3.4 negative amount', $s$insert into public.transactions (kind, category_id, amount) values ('expense', current_setting('test.a_food')::uuid, -5)$s$, '23514'),
      ('3.4 unknown kind', $s$insert into public.transactions (kind, category_id, amount) values ('transfer', current_setting('test.a_food')::uuid, 10)$s$, '23514'),
      ('3.4 empty merchant', $s$insert into public.transactions (kind, category_id, amount, merchant) values ('expense', current_setting('test.a_food')::uuid, 10, '')$s$, '23514'),
      ('3.4 untrimmed merchant', $s$insert into public.transactions (kind, category_id, amount, merchant) values ('expense', current_setting('test.a_food')::uuid, 10, ' Pingo Doce')$s$, '23514'),
      ('3.4 merchant of 81 characters', $s$insert into public.transactions (kind, category_id, amount, merchant) values ('expense', current_setting('test.a_food')::uuid, 10, repeat('x', 81))$s$, '23514'),
      ('3.4 empty note', $s$insert into public.transactions (kind, category_id, amount, note) values ('expense', current_setting('test.a_food')::uuid, 10, '')$s$, '23514'),
      ('3.4 note ending in a newline', $s$insert into public.transactions (kind, category_id, amount, note) values ('expense', current_setting('test.a_food')::uuid, 10, 'Jantar' || chr(10))$s$, '23514'),
      ('3.4 note of 201 characters', $s$insert into public.transactions (kind, category_id, amount, note) values ('expense', current_setting('test.a_food')::uuid, 10, repeat('x', 201))$s$, '23514'),
      -- 3.5 No day after Lisbon's today: the insert and update policies.
      ('3.5 insert tomorrow', $s$insert into public.transactions (kind, category_id, amount, occurred_on) values ('expense', current_setting('test.a_food')::uuid, 10, current_setting('test.lisbon_today')::date + 1)$s$, '42501'),
      ('3.5 move to tomorrow', $s$update public.transactions set occurred_on = current_setting('test.lisbon_today')::date + 1 where id = current_setting('test.a_transaction')::uuid$s$, '42501'),
      -- 3.6 Budgets through set_budget: an expense category of the same user,
      --     an amount above 0 (null removes the budget).
      ('3.6 set_budget with B''s category', $s$select public.set_budget(current_setting('test.b_home')::uuid, 100)$s$, '23503'),
      ('3.6 set_budget with an income category', $s$select public.set_budget(current_setting('test.a_salary')::uuid, 100)$s$, '23503'),
      ('3.6 set_budget with 0', $s$select public.set_budget(current_setting('test.a_food')::uuid, 0)$s$, '23514'),
      ('3.6 overall budget below 0', $s$select public.set_budget(null, -5)$s$, '23514'),
      -- 3.7 Subscriptions: an expense category of the same user; amount above
      --     0; every 1, 3, 6 or 12 months; name trimmed, 1–80 characters.
      ('3.7 B''s category', $s$insert into public.subscriptions (name, amount, interval_months, reference_date, category_id) values ('Netflix', 10, 1, '2026-11-01', current_setting('test.b_home')::uuid)$s$, '23503'),
      ('3.7 an income category', $s$insert into public.subscriptions (name, amount, interval_months, reference_date, category_id) values ('Netflix', 10, 1, '2026-11-01', current_setting('test.a_salary')::uuid)$s$, '23503'),
      ('3.7 every 2 months', $s$insert into public.subscriptions (name, amount, interval_months, reference_date, category_id) values ('Netflix', 10, 2, '2026-11-01', current_setting('test.a_fun')::uuid)$s$, '23514'),
      ('3.7 amount 0', $s$insert into public.subscriptions (name, amount, interval_months, reference_date, category_id) values ('Netflix', 0, 1, '2026-11-01', current_setting('test.a_fun')::uuid)$s$, '23514'),
      ('3.7 empty name', $s$insert into public.subscriptions (name, amount, interval_months, reference_date, category_id) values ('', 10, 1, '2026-11-01', current_setting('test.a_fun')::uuid)$s$, '23514'),
      ('3.7 untrimmed name', $s$insert into public.subscriptions (name, amount, interval_months, reference_date, category_id) values ('Netflix ', 10, 1, '2026-11-01', current_setting('test.a_fun')::uuid)$s$, '23514'),
      ('3.7 name of 81 characters', $s$insert into public.subscriptions (name, amount, interval_months, reference_date, category_id) values (repeat('x', 81), 10, 1, '2026-11-01', current_setting('test.a_fun')::uuid)$s$, '23514'),
      ('3.7 move to an income category', $s$update public.subscriptions set category_id = current_setting('test.a_salary')::uuid where id = current_setting('test.a_subscription_kept')::uuid$s$, '23503'),
      -- 3.8 Columns and operations outside the grants.
      ('3.8 category with B''s user_id', $s$insert into public.categories (user_id, kind, name) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'expense', 'Saúde')$s$, '42501'),
      ('3.8 category with a chosen id', $s$insert into public.categories (id, kind, name) values (gen_random_uuid(), 'expense', 'Saúde')$s$, '42501'),
      ('3.8 change a category''s kind', $s$update public.categories set kind = 'income' where id = current_setting('test.a_unused')::uuid$s$, '42501'),
      ('3.8 change a category''s user_id', $s$update public.categories set user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' where id = current_setting('test.a_unused')::uuid$s$, '42501'),
      ('3.8 transaction with B''s user_id', $s$insert into public.transactions (user_id, kind, category_id, amount) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'expense', current_setting('test.a_food')::uuid, 10)$s$, '42501'),
      ('3.8 transaction with a chosen created_at', $s$insert into public.transactions (kind, category_id, amount, created_at) values ('expense', current_setting('test.a_food')::uuid, 10, now() - interval '1 day')$s$, '42501'),
      ('3.8 change a transaction''s user_id', $s$update public.transactions set user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' where id = current_setting('test.a_transaction')::uuid$s$, '42501'),
      ('3.8 change a transaction''s created_at', $s$update public.transactions set created_at = now() - interval '1 day' where id = current_setting('test.a_transaction')::uuid$s$, '42501'),
      ('3.8 budget with a chosen month', $s$insert into public.budgets (category_id, amount, starts_on) values (current_setting('test.a_food')::uuid, 100, current_setting('test.month_start')::date)$s$, '42501'),
      ('3.8 budget with a chosen category_kind', $s$insert into public.budgets (category_id, amount, category_kind) values (current_setting('test.a_food')::uuid, 100, 'expense')$s$, '42501'),
      ('3.8 budget with B''s user_id', $s$insert into public.budgets (user_id, category_id, amount) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', null, 100)$s$, '42501'),
      ('3.8 change a budget''s month', $s$update public.budgets set starts_on = '2020-01-01'$s$, '42501'),
      ('3.8 change a budget''s category', $s$update public.budgets set category_id = current_setting('test.a_food')::uuid$s$, '42501'),
      ('3.8 delete a budget', $s$delete from public.budgets$s$, '42501'),
      ('3.8 subscription with a chosen category_kind', $s$insert into public.subscriptions (name, amount, interval_months, reference_date, category_id, category_kind) values ('Netflix', 10, 1, '2026-11-01', current_setting('test.a_fun')::uuid, 'expense')$s$, '42501'),
      ('3.8 change a subscription''s user_id', $s$update public.subscriptions set user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' where id = current_setting('test.a_subscription_kept')::uuid$s$, '42501'),
      ('3.8 truncate categories', $s$truncate public.categories$s$, '42501'),
      ('3.8 truncate transactions', $s$truncate public.transactions$s$, '42501'),
      ('3.8 truncate budgets', $s$truncate public.budgets$s$, '42501'),
      ('3.8 truncate subscriptions', $s$truncate public.subscriptions$s$, '42501')
    ) as cases(label, stmt, expected)
  loop
    begin
      execute c.stmt;
      raise exception 'FAIL %: no error (expected %)', c.label, c.expected;
    exception when others then
      get stacked diagnostics got = returned_sqlstate;
      if got = 'P0001' then
        raise;
      end if;
      if got <> c.expected then
        raise exception 'FAIL %: got % instead of %', c.label, got, c.expected;
      end if;
    end;
  end loop;
end $$;

-- 3.9 set_budget: the month is the first day of Lisbon's current month; a
--     second change in the same month replaces that month's row, for the
--     overall budget (category_id null) and for a category; null removes it.
do $$
declare
  first_id uuid;
  second_id uuid;
  rows_found bigint;
  stored_amount text;
  stored_month date;
begin
  first_id := public.set_budget(null, 1500);
  second_id := public.set_budget(null, '1200.00');
  select count(*), max(amount::text), max(starts_on) into rows_found, stored_amount, stored_month
  from public.budgets where category_id is null;
  if first_id is distinct from second_id or rows_found <> 1 or stored_amount is distinct from '1200.00'
    or stored_month is distinct from current_setting('test.month_start')::date then
    raise exception 'FAIL 3.9: overall budget: % row(s), %, from % (ids % and %)',
      rows_found, stored_amount, stored_month, first_id, second_id;
  end if;

  perform public.set_budget(current_setting('test.a_home')::uuid, 300);
  perform public.set_budget(current_setting('test.a_home')::uuid, null);
  select count(*), max(amount::text) into rows_found, stored_amount
  from public.budgets where category_id = current_setting('test.a_home')::uuid;
  if rows_found <> 1 or stored_amount is not null then
    raise exception 'FAIL 3.9: category budget: % row(s), amount %', rows_found, stored_amount;
  end if;
end $$;

-- 3.10 An earlier month's row never changes. It is created as postgres (the
--      table owner, which RLS does not apply to), since A cannot choose a month.
reset role;

insert into public.budgets (user_id, category_id, starts_on, amount)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  current_setting('test.a_home')::uuid,
  (current_setting('test.month_start')::date - interval '1 month')::date,
  999
);

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  changed integer;
  rows_found bigint;
begin
  update public.budgets set amount = 1 where starts_on < current_setting('test.month_start')::date;
  get diagnostics changed = row_count;
  if changed <> 0 then
    raise exception 'FAIL 3.10: A changed % row(s) of an earlier month', changed;
  end if;

  -- set_budget changes this month's row (null → 400) and leaves last month's.
  perform public.set_budget(current_setting('test.a_home')::uuid, 400);
  select count(*) into rows_found from public.budgets where category_id = current_setting('test.a_home')::uuid;
  if rows_found <> 2
    or not exists (
      select 1 from public.budgets
      where category_id = current_setting('test.a_home')::uuid
        and starts_on = current_setting('test.month_start')::date and amount = 400
    )
    or not exists (
      select 1 from public.budgets
      where category_id = current_setting('test.a_home')::uuid
        and starts_on < current_setting('test.month_start')::date and amount = 999
    ) then
    raise exception 'FAIL 3.10: the category''s budgets are not this month 400 and last month 999';
  end if;
end $$;

-- 3.11 Isolation: A sees none of B's rows, and cannot change or remove them.
do $$
declare
  t text;
  foreign_rows bigint;
  changed integer;
begin
  foreach t in array array['categories', 'transactions', 'budgets', 'subscriptions'] loop
    execute format('select count(*) from public.%I where user_id <> %L', t, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    into foreign_rows;
    if foreign_rows <> 0 then
      raise exception 'FAIL 3.11: A sees % of B''s rows in %', foreign_rows, t;
    end if;
  end loop;

  if exists (select 1 from public.categories where id = current_setting('test.b_home')::uuid)
    or exists (select 1 from public.transactions where id = current_setting('test.b_transaction')::uuid)
    or exists (select 1 from public.subscriptions where id = current_setting('test.b_subscription')::uuid) then
    raise exception 'FAIL 3.11: A can read one of B''s rows by id';
  end if;

  update public.categories set name = 'Mudada' where id = current_setting('test.b_home')::uuid;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'FAIL 3.11: A renamed B''s category'; end if;

  update public.transactions set amount = 1 where id = current_setting('test.b_transaction')::uuid;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'FAIL 3.11: A changed B''s transaction'; end if;

  update public.budgets set amount = 1 where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'FAIL 3.11: A changed B''s budgets'; end if;

  update public.subscriptions set amount = 1 where id = current_setting('test.b_subscription')::uuid;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'FAIL 3.11: A changed B''s subscription'; end if;

  delete from public.transactions where id = current_setting('test.b_transaction')::uuid;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'FAIL 3.11: A deleted B''s transaction'; end if;

  delete from public.subscriptions where id = current_setting('test.b_subscription')::uuid;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'FAIL 3.11: A deleted B''s subscription'; end if;

  delete from public.categories where id = current_setting('test.b_home')::uuid;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'FAIL 3.11: A deleted B''s category'; end if;
end $$;

-- 3.12 Deleting: a category in use (by transactions, a budget, even one with
--      no amount, or subscriptions) is refused (23503); an unused one is
--      deleted. An archived category keeps its name. Own transactions and
--      subscriptions can be deleted.
do $$
declare
  changed integer;
  in_use text;
begin
  foreach in_use in array array['a_food', 'a_home', 'a_fun'] loop
    begin
      execute format('delete from public.categories where id = %L', current_setting('test.' || in_use));
      raise exception 'FAIL 3.12: the category in use (%) was deleted', in_use;
    exception when foreign_key_violation then null;
    end;
  end loop;

  delete from public.categories where id = current_setting('test.a_unused')::uuid;
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'FAIL 3.12: deleting an unused category removed % rows', changed; end if;

  update public.categories set archived_at = now() where id = current_setting('test.a_fun')::uuid;
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'FAIL 3.12: archiving changed % rows', changed; end if;
  begin
    insert into public.categories (kind, name) values ('expense', 'lazer');
    raise exception 'FAIL 3.12: a new category took an archived name';
  exception when unique_violation then null;
  end;

  delete from public.transactions where id = current_setting('test.a_transaction')::uuid;
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'FAIL 3.12: deleting a transaction removed % rows', changed; end if;

  delete from public.subscriptions where id = current_setting('test.a_subscription_deleted')::uuid;
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'FAIL 3.12: deleting a subscription removed % rows', changed; end if;

  -- Cancelling archives.
  update public.subscriptions set archived_at = now() where id = current_setting('test.a_subscription_kept')::uuid;
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'FAIL 3.12: archiving a subscription changed % rows', changed; end if;
end $$;

-- 3.13 set_budget runs as the caller, with an empty search_path.
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_proc p
    where p.oid = 'public.set_budget(uuid, numeric)'::regprocedure
      and not p.prosecdef
      and p.proconfig = array['search_path=""']
  ) then
    raise exception 'FAIL 3.13: set_budget is not security invoker with an empty search_path';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. User B: everything is as B left it, and none of A's rows is visible.
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  t text;
  foreign_rows bigint;
begin
  foreach t in array array['categories', 'transactions', 'budgets', 'subscriptions'] loop
    execute format('select count(*) from public.%I where user_id <> %L', t, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    into foreign_rows;
    if foreign_rows <> 0 then
      raise exception 'FAIL 4.1: B sees % of A''s rows in %', foreign_rows, t;
    end if;
  end loop;

  if not exists (select 1 from public.categories where id = current_setting('test.b_home')::uuid and name = 'Casa')
    or (select count(*) from public.categories) <> 2
    or not exists (select 1 from public.transactions where id = current_setting('test.b_transaction')::uuid and amount = 650)
    or (select count(*) from public.transactions) <> 2
    or not exists (select 1 from public.budgets where category_id is null and amount = 1000)
    or not exists (select 1 from public.budgets where category_id = current_setting('test.b_home')::uuid and amount = 700)
    or (select count(*) from public.budgets) <> 2
    or not exists (select 1 from public.subscriptions where id = current_setting('test.b_subscription')::uuid and amount = 30) then
    raise exception 'FAIL 4.2: B''s data changed';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Deleting a user deletes all their finance data, and nothing of anyone
--    else's. The foreign keys to categories are NO ACTION, checked at the end
--    of the statement, after the cascades from auth.users have removed the
--    rows that use those categories. Run as postgres (the table owner, which
--    RLS does not apply to).
-- ---------------------------------------------------------------------------
reset role;

-- A has rows in all four tables before the delete, so "none left" means
-- something: categories used by transactions, by budgets (one of them from an
-- earlier month) and by an archived subscription.
do $$
declare
  t text;
  existing bigint;
begin
  foreach t in array array['categories', 'transactions', 'budgets', 'subscriptions'] loop
    execute format('select count(*) from public.%I where user_id = %L', t, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    into existing;
    if existing = 0 then
      raise exception 'FAIL 5.0: A has no rows in % before the delete', t;
    end if;
  end loop;
end $$;

delete from auth.users where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

do $$
declare
  t text;
  remaining bigint;
begin
  foreach t in array array['categories', 'transactions', 'budgets', 'subscriptions'] loop
    execute format('select count(*) from public.%I where user_id = %L', t, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    into remaining;
    if remaining <> 0 then
      raise exception 'FAIL 5.1: % of A''s rows left in % after deleting A', remaining, t;
    end if;

    execute format('select count(*) from public.%I where user_id = %L', t, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    into remaining;
    if remaining = 0 then
      raise exception 'FAIL 5.2: deleting A also removed B''s rows in %', t;
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Nothing is kept.
-- ---------------------------------------------------------------------------
rollback;

select 'All finance checks passed' as result;
