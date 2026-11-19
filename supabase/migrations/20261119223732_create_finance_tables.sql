-- Finance module: categories, transactions, budgets and subscriptions
-- (see docs/decisions.md, Finance module).
--
-- Every table follows the gym tables and weight_entries: user_id comes from
-- auth.uid(), privileges are granted per column, and RLS has one policy per
-- operation, for signed-in users only.
--
-- Rows that point at a category use a composite foreign key that includes the
-- category's kind, so they can only point at a category of the same user and
-- of the right kind: a transaction at one of its own kind, a budget or a
-- subscription at an expense category. Foreign key checks do not go through
-- RLS, so a plain foreign key would accept another user's id.
--
-- The foreign keys to auth.users cascade, so deleting a user deletes all their
-- finance data. The foreign keys to categories do not (NO ACTION, the
-- default): deleting a category that anything uses fails with 23503, and the
-- app archives it instead. NO ACTION, not RESTRICT, because it is checked at
-- the end of the statement: when a user is deleted, the cascades remove their
-- categories and the rows that use them in the same statement, so the check
-- passes. RESTRICT is checked at once and could fail halfway.
--
-- Money is numeric(12, 2), never floating point. The app reads amount::text,
-- keeps whole cents, and writes text ("12.50"). The database only refuses
-- impossible amounts (0 or less); the form's limit (99 999,99 €) is the app's.
-- numeric(12, 2) rounds a third decimal silently, which only a hand-made
-- request could send, and still stores a valid amount.

-- ---------------------------------------------------------------------------
-- Categories: the user's own, each for expenses or income.
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null,
  name text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_kind_check check (kind in ('expense', 'income')),
  -- The app trims names; the database refuses untrimmed ones instead of
  -- silently changing them.
  constraint categories_name_trimmed check (name !~ '^\s' and name !~ '\s$'),
  constraint categories_name_length check (char_length(name) between 1 and 40),
  -- Target of the composite foreign keys, which include the kind.
  constraint categories_id_user_id_kind_key unique (id, user_id, kind)
);

-- Names are unique per user and kind, ignoring case ("Outros" can exist once
-- for expenses and once for income). Archived categories keep their names.
-- The app also ignores accents.
create unique index categories_user_id_kind_name_key on public.categories (user_id, kind, lower(name));

-- ---------------------------------------------------------------------------
-- Transactions: income and expenses. The amount is always positive; the kind
-- says which way the money went.
-- ---------------------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null,
  category_id uuid not null,
  amount numeric(12, 2) not null,
  -- Lisbon's calendar day by default. now() is an absolute instant; "at time
  -- zone" turns it into Lisbon's wall-clock time, summer time included,
  -- whatever the session's time zone. Earlier days can be chosen, later ones
  -- cannot (see the policies below).
  occurred_on date not null default ((now() at time zone 'Europe/Lisbon')::date),
  merchant text,
  note text,
  -- Within a day, the list follows the order in which transactions were
  -- logged: created_at is never written by the client and never changes.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_category_fkey
    foreign key (category_id, user_id, kind) references public.categories (id, user_id, kind),
  constraint transactions_kind_check check (kind in ('expense', 'income')),
  constraint transactions_amount_check check (amount > 0),
  -- Optional texts: null, or trimmed and not empty. The app trims them and
  -- sends null for an empty field.
  constraint transactions_merchant_check check (
    merchant is null
    or (char_length(merchant) between 1 and 80 and merchant !~ '^\s' and merchant !~ '\s$')
  ),
  constraint transactions_note_check check (
    note is null
    or (char_length(note) between 1 and 200 and note !~ '^\s' and note !~ '\s$')
  )
);

-- A month's transactions, newest first: the read filters on occurred_on and
-- orders by (occurred_on, created_at).
create index transactions_user_id_occurred_on_idx
  on public.transactions (user_id, occurred_on desc, created_at desc);
-- Deleting a category checks that no transaction uses it.
create index transactions_category_id_idx on public.transactions (category_id);

-- ---------------------------------------------------------------------------
-- Budgets: one row per change, from a month on. A month's budget is the one in
-- the latest row already in force in that month. category_id null is the
-- overall budget; amount null is "no budget from this month on".
-- ---------------------------------------------------------------------------
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid,
  -- Always 'expense', and never written by the client: it makes the composite
  -- foreign key accept expense categories only. With category_id null (the
  -- overall budget) the foreign key is not checked (MATCH SIMPLE).
  category_kind text not null default 'expense',
  -- The first day of Lisbon's current month, decided by the database. The
  -- client cannot write it, and the policies only accept the current month.
  starts_on date not null default ((date_trunc('month', now() at time zone 'Europe/Lisbon'))::date),
  amount numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budgets_category_fkey
    foreign key (category_id, user_id, category_kind) references public.categories (id, user_id, kind),
  constraint budgets_category_kind_check check (category_kind = 'expense'),
  constraint budgets_starts_on_first_day check (extract(day from starts_on) = 1),
  -- null removes the budget; 0 would be a real budget, so it is refused.
  constraint budgets_amount_check check (amount is null or amount > 0),
  -- One row per user, category (or the overall budget) and month. NULLS NOT
  -- DISTINCT makes two overall rows in the same month collide too, so
  -- set_budget's upsert replaces the month's row. The index also serves the
  -- reads (budgets are read whole) and the category's foreign key.
  constraint budgets_one_per_month unique nulls not distinct (user_id, category_id, starts_on)
);

-- ---------------------------------------------------------------------------
-- Subscriptions (version A): a list, never turned into transactions. The next
-- payment is calculated by the app from reference_date, never stored.
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null,
  interval_months smallint not null,
  -- The date of one payment, past or future.
  reference_date date not null,
  category_id uuid not null,
  -- Always 'expense', as in budgets.
  category_kind text not null default 'expense',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_category_fkey
    foreign key (category_id, user_id, category_kind) references public.categories (id, user_id, kind),
  constraint subscriptions_category_kind_check check (category_kind = 'expense'),
  -- Names may repeat.
  constraint subscriptions_name_trimmed check (name !~ '^\s' and name !~ '\s$'),
  constraint subscriptions_name_length check (char_length(name) between 1 and 80),
  constraint subscriptions_amount_check check (amount > 0),
  constraint subscriptions_interval_months_check check (interval_months in (1, 3, 6, 12))
);

-- Deleting a category checks that no subscription uses it.
create index subscriptions_category_id_idx on public.subscriptions (category_id);

-- ---------------------------------------------------------------------------
-- updated_at (set_updated_at comes from the weight_entries migration).
-- ---------------------------------------------------------------------------
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

create trigger budgets_set_updated_at
before update on public.budgets
for each row execute function public.set_updated_at();

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: explicit even though automatic RLS is on.
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.subscriptions enable row level security;

-- ---------------------------------------------------------------------------
-- Privileges. New tables give anon and authenticated TRUNCATE, TRIGGER and
-- MAINTAIN by default, and TRUNCATE ignores RLS: start from nothing. Nothing
-- for anon. Only the listed columns can be written; id, user_id,
-- category_kind, starts_on and the timestamps always come from the database.
-- ---------------------------------------------------------------------------
revoke all on table
  public.categories,
  public.transactions,
  public.budgets,
  public.subscriptions
from anon, authenticated;

grant select on table
  public.categories,
  public.transactions,
  public.budgets,
  public.subscriptions
to authenticated;

-- A category's kind never changes. One that nothing uses can be deleted; the
-- foreign keys refuse to delete one in use (23503), and the app archives it.
grant insert (kind, name), update (name, archived_at) on table public.categories to authenticated;
grant delete on table public.categories to authenticated;

-- Any transaction can be edited or deleted.
grant insert (kind, category_id, amount, occurred_on, merchant, note),
      update (kind, category_id, amount, occurred_on, merchant, note)
  on table public.transactions to authenticated;
grant delete on table public.transactions to authenticated;

-- Budgets are written through set_budget (below): insert a month's row, or
-- change its amount. No delete: removing a budget is a new row.
grant insert (category_id, amount), update (amount) on table public.budgets to authenticated;

-- Subscriptions can be edited, archived (cancelled) and deleted: nothing
-- refers to them in version A.
grant insert (name, amount, interval_months, reference_date, category_id),
      update (name, amount, interval_months, reference_date, category_id, archived_at)
  on table public.subscriptions to authenticated;
grant delete on table public.subscriptions to authenticated;

-- ---------------------------------------------------------------------------
-- Policies: one per granted operation. (select ...) wrappers make PostgreSQL
-- evaluate each value once per statement instead of once per row.
-- ---------------------------------------------------------------------------
create policy "categories_select_own" on public.categories
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "categories_insert_own" on public.categories
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "categories_update_own" on public.categories
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "categories_delete_own" on public.categories
  for delete to authenticated using ((select auth.uid()) = user_id);

-- A transaction's day is never later than Lisbon's today. A check constraint
-- cannot use now() (PostgreSQL assumes it always gives the same result); a
-- policy is evaluated for each statement.
create policy "transactions_select_own" on public.transactions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "transactions_insert_own" on public.transactions
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and occurred_on <= (select (now() at time zone 'Europe/Lisbon')::date)
  );
create policy "transactions_update_own" on public.transactions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and occurred_on <= (select (now() at time zone 'Europe/Lisbon')::date)
  );
create policy "transactions_delete_own" on public.transactions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Only the current month's row can be written. An update of an earlier
-- month's row finds no row (0 rows, no error), so earlier months stay as
-- they were, even if a grant on starts_on came back by mistake.
create policy "budgets_select_own" on public.budgets
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "budgets_insert_own" on public.budgets
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and starts_on = (select (date_trunc('month', now() at time zone 'Europe/Lisbon'))::date)
  );
create policy "budgets_update_own" on public.budgets
  for update to authenticated
  using (
    (select auth.uid()) = user_id
    and starts_on = (select (date_trunc('month', now() at time zone 'Europe/Lisbon'))::date)
  )
  with check (
    (select auth.uid()) = user_id
    and starts_on = (select (date_trunc('month', now() at time zone 'Europe/Lisbon'))::date)
  );

create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "subscriptions_insert_own" on public.subscriptions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "subscriptions_update_own" on public.subscriptions
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "subscriptions_delete_own" on public.subscriptions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- set_budget: sets this month's budget for a category, or the overall budget
-- (category_id null). amount null removes it from this month on. A second
-- change in the same month replaces that month's row.
--
-- Why a function: the Data API's upsert puts every column it sends in
-- DO UPDATE SET, so it would need UPDATE on category_id. This upsert only
-- updates amount, so the grants stay as narrow as above.
--
-- security invoker: it runs as the signed-in user, so RLS, the column grants
-- and the composite foreign key all apply inside it. The empty search_path
-- stops names from resolving through other schemas. Arguments are qualified
-- with the function's name, since they share names with columns.
-- ---------------------------------------------------------------------------
create function public.set_budget(category_id uuid, amount numeric)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  insert into public.budgets (category_id, amount)
  values (set_budget.category_id, set_budget.amount)
  on conflict (user_id, category_id, starts_on) do update set amount = excluded.amount
  returning id;
$$;

revoke execute on function public.set_budget(uuid, numeric) from public, anon;
grant execute on function public.set_budget(uuid, numeric) to authenticated;
