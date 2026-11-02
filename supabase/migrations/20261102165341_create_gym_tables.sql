-- Gym module: exercises, routines and finished workouts (see docs/decisions.md, Gym module).
--
-- Every table follows weight_entries: user_id comes from auth.uid(), privileges
-- are granted per column, and RLS has one policy per operation, for signed-in
-- users only.
--
-- Rows that point at another table use composite foreign keys on (id, user_id),
-- so they can only point at rows of the same user. Foreign key checks do not go
-- through RLS, so a plain foreign key would accept another user's id.
--
-- Every foreign key cascades: deleting a user deletes all their gym data. The
-- app itself never deletes exercises, routines or workouts (they are archived,
-- or kept as history), so the cascades only matter when a user is deleted.

-- ---------------------------------------------------------------------------
-- Exercises
-- ---------------------------------------------------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The app trims names; the database refuses untrimmed ones instead of
  -- silently changing them.
  constraint exercises_name_trimmed check (name !~ '^\s' and name !~ '\s$'),
  constraint exercises_name_length check (char_length(name) between 1 and 80),
  -- Target of the composite foreign keys.
  constraint exercises_id_user_id_key unique (id, user_id)
);

-- Names are unique per user ignoring case. With trimming enforced above,
-- "Supino " is refused and "supino" collides with "Supino".
create unique index exercises_user_id_name_key on public.exercises (user_id, lower(name));

-- ---------------------------------------------------------------------------
-- Routines
-- ---------------------------------------------------------------------------
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  -- Not unique: lists are ordered by (position, created_at), so swapping two
  -- positions in two requests never fails halfway.
  position integer not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routines_name_trimmed check (name !~ '^\s' and name !~ '\s$'),
  constraint routines_name_length check (char_length(name) between 1 and 60),
  constraint routines_position_check check (position >= 0),
  constraint routines_id_user_id_key unique (id, user_id)
);

create index routines_user_id_position_idx on public.routines (user_id, position);

-- ---------------------------------------------------------------------------
-- A routine's exercises, in order, with target sets and an optional rep range
-- ---------------------------------------------------------------------------
create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  routine_id uuid not null,
  exercise_id uuid not null,
  position integer not null,
  target_sets smallint not null,
  rep_min smallint,
  rep_max smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routine_exercises_routine_fkey
    foreign key (routine_id, user_id) references public.routines (id, user_id) on delete cascade,
  constraint routine_exercises_exercise_fkey
    foreign key (exercise_id, user_id) references public.exercises (id, user_id) on delete cascade,
  constraint routine_exercises_position_check check (position >= 0),
  constraint routine_exercises_target_sets_check check (target_sets between 1 and 20),
  -- Both empty, or both set with 1 <= min <= max <= 100. A single number is
  -- stored as min = max. (A check with only one value null would pass, so both
  -- are tested explicitly.)
  constraint routine_exercises_rep_range_check check (
    (rep_min is null and rep_max is null)
    or (rep_min is not null and rep_max is not null and rep_min >= 1 and rep_min <= rep_max and rep_max <= 100)
  ),
  -- The same exercise appears at most once in a routine. This index also
  -- serves the routine's foreign key and its list.
  constraint routine_exercises_one_per_routine unique (routine_id, exercise_id)
);

create index routine_exercises_exercise_id_idx on public.routine_exercises (exercise_id);

-- ---------------------------------------------------------------------------
-- Finished workouts. Written only through submit_workout (next migration),
-- never updated or deleted by the app.
-- ---------------------------------------------------------------------------
create table public.workouts (
  -- Created on the device when the workout starts (no default), so sending it
  -- again after a network failure cannot create a second workout.
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  routine_id uuid not null,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint workouts_routine_fkey
    foreign key (routine_id, user_id) references public.routines (id, user_id) on delete cascade,
  constraint workouts_finished_after_started check (finished_at >= started_at),
  -- Catches a wrong clock or a workout left open by mistake.
  constraint workouts_duration_check check (finished_at - started_at <= interval '24 hours'),
  constraint workouts_id_user_id_key unique (id, user_id)
);

-- History, the next routine and the activity heatmap all read workouts by date.
create index workouts_user_id_finished_at_idx on public.workouts (user_id, finished_at desc);
create index workouts_routine_id_idx on public.workouts (routine_id);

-- ---------------------------------------------------------------------------
-- The exercises done in a workout, in order: a record of what was done, so it
-- does not change when the routine changes.
-- ---------------------------------------------------------------------------
create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workout_id uuid not null,
  exercise_id uuid not null,
  position integer not null,
  created_at timestamptz not null default now(),
  constraint workout_exercises_workout_fkey
    foreign key (workout_id, user_id) references public.workouts (id, user_id) on delete cascade,
  constraint workout_exercises_exercise_fkey
    foreign key (exercise_id, user_id) references public.exercises (id, user_id) on delete cascade,
  constraint workout_exercises_position_check check (position >= 0),
  constraint workout_exercises_position_key unique (workout_id, position),
  -- The same exercise appears at most once in a workout.
  constraint workout_exercises_one_per_workout unique (workout_id, exercise_id),
  constraint workout_exercises_id_user_id_key unique (id, user_id)
);

-- "Last time": the latest sets of one exercise for one user.
create index workout_exercises_user_id_exercise_id_idx on public.workout_exercises (user_id, exercise_id);

-- ---------------------------------------------------------------------------
-- The logged sets of each exercise in a workout (weight × reps)
-- ---------------------------------------------------------------------------
create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workout_exercise_id uuid not null,
  position integer not null,
  -- numeric, never floating point. Weight is always required.
  weight_kg numeric(6, 2) not null,
  reps smallint not null,
  created_at timestamptz not null default now(),
  constraint workout_sets_workout_exercise_fkey
    foreign key (workout_exercise_id, user_id) references public.workout_exercises (id, user_id) on delete cascade,
  constraint workout_sets_position_check check (position >= 0),
  constraint workout_sets_weight_kg_check check (weight_kg > 0 and weight_kg <= 1000),
  constraint workout_sets_reps_check check (reps between 1 and 100),
  constraint workout_sets_position_key unique (workout_exercise_id, position)
);

-- ---------------------------------------------------------------------------
-- updated_at on the tables the app edits (set_updated_at comes from the
-- weight_entries migration).
-- ---------------------------------------------------------------------------
create trigger exercises_set_updated_at
before update on public.exercises
for each row execute function public.set_updated_at();

create trigger routines_set_updated_at
before update on public.routines
for each row execute function public.set_updated_at();

create trigger routine_exercises_set_updated_at
before update on public.routine_exercises
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: explicit even though automatic RLS is on.
-- ---------------------------------------------------------------------------
alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;

-- ---------------------------------------------------------------------------
-- Privileges. New tables give anon and authenticated TRUNCATE, TRIGGER and
-- MAINTAIN by default, and TRUNCATE ignores RLS: start from nothing. Nothing
-- for anon. Only the listed columns can be written; id (except a workout's),
-- user_id and the timestamps always come from the database.
-- ---------------------------------------------------------------------------
revoke all on table
  public.exercises,
  public.routines,
  public.routine_exercises,
  public.workouts,
  public.workout_exercises,
  public.workout_sets
from anon, authenticated;

grant select on table
  public.exercises,
  public.routines,
  public.routine_exercises,
  public.workouts,
  public.workout_exercises,
  public.workout_sets
to authenticated;

-- Exercises and routines are archived (archived_at), never deleted.
grant insert (name), update (name, archived_at) on table public.exercises to authenticated;
grant insert (name, position), update (name, position, archived_at) on table public.routines to authenticated;

-- A routine entry's routine and exercise cannot change: remove it (×) and add another.
grant insert (routine_id, exercise_id, position, target_sets, rep_min, rep_max),
      update (position, target_sets, rep_min, rep_max)
  on table public.routine_exercises to authenticated;
grant delete on table public.routine_exercises to authenticated;

-- Workouts are history: insert only (through submit_workout), no update or delete.
grant insert (id, routine_id, started_at, finished_at) on table public.workouts to authenticated;
grant insert (workout_id, exercise_id, position) on table public.workout_exercises to authenticated;
grant insert (workout_exercise_id, position, weight_kg, reps) on table public.workout_sets to authenticated;

-- ---------------------------------------------------------------------------
-- Policies: one per granted operation. (select auth.uid()) is evaluated once
-- per statement instead of once per row.
-- ---------------------------------------------------------------------------
create policy "exercises_select_own" on public.exercises
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "exercises_insert_own" on public.exercises
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "exercises_update_own" on public.exercises
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "routines_select_own" on public.routines
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "routines_insert_own" on public.routines
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "routines_update_own" on public.routines
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "routine_exercises_select_own" on public.routine_exercises
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "routine_exercises_insert_own" on public.routine_exercises
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "routine_exercises_update_own" on public.routine_exercises
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "routine_exercises_delete_own" on public.routine_exercises
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "workouts_select_own" on public.workouts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "workouts_insert_own" on public.workouts
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "workout_exercises_select_own" on public.workout_exercises
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "workout_exercises_insert_own" on public.workout_exercises
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "workout_sets_select_own" on public.workout_sets
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "workout_sets_insert_own" on public.workout_sets
  for insert to authenticated with check ((select auth.uid()) = user_id);
