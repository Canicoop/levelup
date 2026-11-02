-- Security tests for the gym tables and submit_workout: privileges, RLS,
-- composite foreign keys, constraints, idempotent sending and cascades.
--
-- How to run: paste the whole file into the SQL Editor of levelup-dev and run it.
-- Everything happens inside one transaction that is never committed, so nothing
-- is kept: neither the two fake users nor their data. A failed check raises an
-- exception whose message starts with "FAIL", which aborts the transaction.
-- The last result is "All gym checks passed" when everything holds.
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
-- is a FAIL. Codes: 42501 privilege, 23503 foreign key, 23505 unique,
-- 23514 check, 23502 not null, 22023 invalid parameter, 22P02 invalid text.

begin;

insert into auth.users (id, aud, role, email)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'gym-test-a@example.invalid'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'gym-test-b@example.invalid');

-- ---------------------------------------------------------------------------
-- 1. Without a session (anon): no access to any table or to submit_workout.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

do $$
declare
  t text;
  stmt text;
begin
  foreach t in array array['exercises', 'routines', 'routine_exercises', 'workouts', 'workout_exercises', 'workout_sets'] loop
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
  perform public.submit_workout('{}'::jsonb);
  raise exception 'FAIL 1.2: anon could execute submit_workout';
exception when insufficient_privilege then null;
end $$;

-- ---------------------------------------------------------------------------
-- 2. User B: an exercise, a routine with it, and one sent workout.
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true);
set local role authenticated;

-- Variables are prefixed with b_ so they never collide with column names.
do $$
declare
  b_exercise uuid;
  b_routine uuid;
  b_routine_exercise uuid;
  b_workout uuid;
  b_workout_exercise uuid;
begin
  insert into public.exercises (name) values ('Supino') returning id into b_exercise;
  insert into public.routines (name, position) values ('Rotina B', 0) returning id into b_routine;
  insert into public.routine_exercises (routine_id, exercise_id, position, target_sets, rep_min, rep_max)
  values (b_routine, b_exercise, 0, 3, 8, 12)
  returning id into b_routine_exercise;

  b_workout := public.submit_workout(jsonb_build_object(
    'id', 'bbbbbbbb-0000-4000-8000-000000000001',
    'routine_id', b_routine,
    'started_at', '2026-11-01T10:00:00Z',
    'finished_at', '2026-11-01T11:00:00Z',
    'exercises', jsonb_build_array(jsonb_build_object(
      'exercise_id', b_exercise,
      'sets', jsonb_build_array(jsonb_build_object('weight_kg', 60, 'reps', 10))
    ))
  ));
  select we.id into b_workout_exercise from public.workout_exercises we where we.workout_id = b_workout;

  if b_workout is distinct from 'bbbbbbbb-0000-4000-8000-000000000001' or b_workout_exercise is null then
    raise exception 'FAIL 2.1: B''s workout was not saved';
  end if;

  perform set_config('test.b_exercise', b_exercise::text, true);
  perform set_config('test.b_routine', b_routine::text, true);
  perform set_config('test.b_routine_exercise', b_routine_exercise::text, true);
  perform set_config('test.b_workout', b_workout::text, true);
  perform set_config('test.b_workout_exercise', b_workout_exercise::text, true);
end $$;

-- ---------------------------------------------------------------------------
-- 3. User A.
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);
set local role authenticated;

-- 3.1 A's exercises (the same name as B's is fine: names are unique per user)
--     and a routine. A single rep number is stored as min = max.
do $$
declare
  a_bench public.exercises;
  a_squat uuid;
  a_row uuid;
  a_routine uuid;
begin
  insert into public.exercises (name) values ('Supino') returning * into a_bench;
  if a_bench.user_id is distinct from 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' then
    raise exception 'FAIL 3.1: A''s exercise got user_id %', a_bench.user_id;
  end if;
  insert into public.exercises (name) values ('Agachamento') returning id into a_squat;
  insert into public.exercises (name) values ('Remada') returning id into a_row;

  insert into public.routines (name, position) values ('Rotina A', 0) returning id into a_routine;
  insert into public.routine_exercises (routine_id, exercise_id, position, target_sets, rep_min, rep_max)
  values (a_routine, a_bench.id, 0, 3, 8, 12),
         (a_routine, a_squat, 1, 5, 5, 5);

  perform set_config('test.a_bench', a_bench.id::text, true);
  perform set_config('test.a_squat', a_squat::text, true);
  perform set_config('test.a_row', a_row::text, true);
  perform set_config('test.a_routine', a_routine::text, true);
end $$;

-- 3.2–3.9 Error cases: names, limits, links to B's rows, forbidden columns.
do $$
declare
  c record;
  got text;
begin
  for c in
    select * from (values
      -- 3.2 Names are unique per user, ignoring case.
      ('3.2 same name in lower case', $s$insert into public.exercises (name) values ('supino')$s$, '23505'),
      ('3.2 same name in upper case', $s$insert into public.exercises (name) values ('SUPINO')$s$, '23505'),
      -- 3.3 Names must be trimmed and 1 to 80 characters.
      ('3.3 leading space', $s$insert into public.exercises (name) values (' Supino inclinado')$s$, '23514'),
      ('3.3 trailing space', $s$insert into public.exercises (name) values ('Supino inclinado ')$s$, '23514'),
      ('3.3 trailing tab', $s$insert into public.exercises (name) values ('Supino inclinado' || chr(9))$s$, '23514'),
      ('3.3 empty name', $s$insert into public.exercises (name) values ('')$s$, '23514'),
      ('3.3 81 characters', $s$insert into public.exercises (name) values (repeat('x', 81))$s$, '23514'),
      -- 3.4 user_id and id are not in the insert grant.
      ('3.4 exercise with B''s user_id', $s$insert into public.exercises (user_id, name) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Outro')$s$, '42501'),
      ('3.4 exercise with a chosen id', $s$insert into public.exercises (id, name) values (gen_random_uuid(), 'Outro')$s$, '42501'),
      ('3.4 routine with B''s user_id', $s$insert into public.routines (user_id, name, position) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Outra', 1)$s$, '42501'),
      -- 3.5 Routine limits.
      ('3.5 untrimmed routine name', $s$insert into public.routines (name, position) values (' Rotina', 1)$s$, '23514'),
      ('3.5 negative position', $s$insert into public.routines (name, position) values ('Rotina C', -1)$s$, '23514'),
      -- 3.6 The same exercise appears at most once in a routine.
      ('3.6 same exercise twice in a routine', $s$insert into public.routine_exercises (routine_id, exercise_id, position, target_sets) values (current_setting('test.a_routine')::uuid, current_setting('test.a_bench')::uuid, 2, 3)$s$, '23505'),
      -- 3.7 Target sets 1 to 20; reps both empty or 1 <= min <= max <= 100.
      ('3.7 zero target sets', $s$insert into public.routine_exercises (routine_id, exercise_id, position, target_sets) values (current_setting('test.a_routine')::uuid, current_setting('test.a_row')::uuid, 2, 0)$s$, '23514'),
      ('3.7 21 target sets', $s$insert into public.routine_exercises (routine_id, exercise_id, position, target_sets) values (current_setting('test.a_routine')::uuid, current_setting('test.a_row')::uuid, 2, 21)$s$, '23514'),
      ('3.7 rep_min without rep_max', $s$insert into public.routine_exercises (routine_id, exercise_id, position, target_sets, rep_min) values (current_setting('test.a_routine')::uuid, current_setting('test.a_row')::uuid, 2, 3, 8)$s$, '23514'),
      ('3.7 rep_max without rep_min', $s$insert into public.routine_exercises (routine_id, exercise_id, position, target_sets, rep_max) values (current_setting('test.a_routine')::uuid, current_setting('test.a_row')::uuid, 2, 3, 12)$s$, '23514'),
      ('3.7 rep_min above rep_max', $s$insert into public.routine_exercises (routine_id, exercise_id, position, target_sets, rep_min, rep_max) values (current_setting('test.a_routine')::uuid, current_setting('test.a_row')::uuid, 2, 3, 12, 8)$s$, '23514'),
      ('3.7 rep_min of 0', $s$insert into public.routine_exercises (routine_id, exercise_id, position, target_sets, rep_min, rep_max) values (current_setting('test.a_routine')::uuid, current_setting('test.a_row')::uuid, 2, 3, 0, 0)$s$, '23514'),
      ('3.7 rep_max of 101', $s$insert into public.routine_exercises (routine_id, exercise_id, position, target_sets, rep_min, rep_max) values (current_setting('test.a_routine')::uuid, current_setting('test.a_row')::uuid, 2, 3, 100, 101)$s$, '23514'),
      -- 3.8 Links to B's rows: the composite foreign keys refuse them.
      ('3.8 A''s exercise in B''s routine', $s$insert into public.routine_exercises (routine_id, exercise_id, position, target_sets) values (current_setting('test.b_routine')::uuid, current_setting('test.a_row')::uuid, 1, 3)$s$, '23503'),
      ('3.8 B''s exercise in A''s routine', $s$insert into public.routine_exercises (routine_id, exercise_id, position, target_sets) values (current_setting('test.a_routine')::uuid, current_setting('test.b_exercise')::uuid, 2, 3)$s$, '23503'),
      ('3.8 workout from B''s routine', $s$insert into public.workouts (id, routine_id, started_at, finished_at) values (gen_random_uuid(), current_setting('test.b_routine')::uuid, now() - interval '1 hour', now())$s$, '23503'),
      ('3.8 exercise in B''s workout', $s$insert into public.workout_exercises (workout_id, exercise_id, position) values (current_setting('test.b_workout')::uuid, current_setting('test.a_bench')::uuid, 5)$s$, '23503'),
      ('3.8 set in B''s workout exercise', $s$insert into public.workout_sets (workout_exercise_id, position, weight_kg, reps) values (current_setting('test.b_workout_exercise')::uuid, 5, 50, 5)$s$, '23503'),
      -- 3.9 Columns and operations outside the grants.
      ('3.9 change a routine entry''s routine', $s$update public.routine_exercises set routine_id = current_setting('test.b_routine')::uuid where routine_id = current_setting('test.a_routine')::uuid$s$, '42501'),
      ('3.9 change a routine entry''s exercise', $s$update public.routine_exercises set exercise_id = current_setting('test.a_row')::uuid where routine_id = current_setting('test.a_routine')::uuid$s$, '42501'),
      ('3.9 change an exercise''s user_id', $s$update public.exercises set user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' where id = current_setting('test.a_bench')::uuid$s$, '42501'),
      ('3.9 change a routine''s user_id', $s$update public.routines set user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' where id = current_setting('test.a_routine')::uuid$s$, '42501'),
      ('3.9 delete an exercise', $s$delete from public.exercises where id = current_setting('test.a_row')::uuid$s$, '42501'),
      ('3.9 delete a routine', $s$delete from public.routines where id = current_setting('test.a_routine')::uuid$s$, '42501'),
      ('3.9 update a workout', $s$update public.workouts set finished_at = now()$s$, '42501'),
      ('3.9 delete a workout', $s$delete from public.workouts$s$, '42501'),
      ('3.9 update a workout exercise', $s$update public.workout_exercises set position = 9$s$, '42501'),
      ('3.9 delete a workout exercise', $s$delete from public.workout_exercises$s$, '42501'),
      ('3.9 update a set', $s$update public.workout_sets set reps = 1$s$, '42501'),
      ('3.9 delete a set', $s$delete from public.workout_sets$s$, '42501'),
      ('3.9 truncate exercises', $s$truncate public.exercises$s$, '42501'),
      ('3.9 truncate routines', $s$truncate public.routines$s$, '42501'),
      ('3.9 truncate routine_exercises', $s$truncate public.routine_exercises$s$, '42501'),
      ('3.9 truncate workouts', $s$truncate public.workouts$s$, '42501'),
      ('3.9 truncate workout_exercises', $s$truncate public.workout_exercises$s$, '42501'),
      ('3.9 truncate workout_sets', $s$truncate public.workout_sets$s$, '42501')
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

-- 3.10 Isolation: A sees none of B's rows, and cannot change or remove them.
do $$
declare
  t text;
  foreign_rows bigint;
  changed integer;
begin
  foreach t in array array['exercises', 'routines', 'routine_exercises', 'workouts', 'workout_exercises', 'workout_sets'] loop
    execute format('select count(*) from public.%I where user_id <> %L', t, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    into foreign_rows;
    if foreign_rows <> 0 then
      raise exception 'FAIL 3.10: A sees % of B''s rows in %', foreign_rows, t;
    end if;
  end loop;

  if exists (select 1 from public.exercises where id = current_setting('test.b_exercise')::uuid)
    or exists (select 1 from public.routines where id = current_setting('test.b_routine')::uuid)
    or exists (select 1 from public.workouts where id = current_setting('test.b_workout')::uuid) then
    raise exception 'FAIL 3.10: A can read one of B''s rows by id';
  end if;

  update public.exercises set name = 'Mudado' where id = current_setting('test.b_exercise')::uuid;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'FAIL 3.10: A renamed B''s exercise'; end if;

  update public.routines set name = 'Mudada' where id = current_setting('test.b_routine')::uuid;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'FAIL 3.10: A renamed B''s routine'; end if;

  update public.routine_exercises set target_sets = 1 where id = current_setting('test.b_routine_exercise')::uuid;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'FAIL 3.10: A changed B''s routine entry'; end if;

  delete from public.routine_exercises where id = current_setting('test.b_routine_exercise')::uuid;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'FAIL 3.10: A removed B''s routine entry'; end if;
end $$;

-- 3.11 Archive and reactivate an exercise. An archived name stays taken:
--      the app reactivates the archived exercise instead of creating another.
do $$
declare
  changed integer;
begin
  update public.exercises set archived_at = now() where id = current_setting('test.a_row')::uuid;
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'FAIL 3.11: archiving changed % rows', changed; end if;

  begin
    insert into public.exercises (name) values ('remada');
    raise exception 'FAIL 3.11: a new exercise took an archived name';
  exception when unique_violation then null;
  end;

  update public.exercises set archived_at = null where id = current_setting('test.a_row')::uuid;
  get diagnostics changed = row_count;
  if changed <> 1 or exists (
    select 1 from public.exercises where id = current_setting('test.a_row')::uuid and archived_at is not null
  ) then
    raise exception 'FAIL 3.11: reactivating did not work';
  end if;

  -- Removing a routine entry (×) is allowed.
  insert into public.routine_exercises (routine_id, exercise_id, position, target_sets)
  values (current_setting('test.a_routine')::uuid, current_setting('test.a_row')::uuid, 2, 3);
  delete from public.routine_exercises
  where routine_id = current_setting('test.a_routine')::uuid and exercise_id = current_setting('test.a_row')::uuid;
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'FAIL 3.11: removing a routine entry removed % rows', changed; end if;
end $$;

-- 3.12 submit_workout with a valid workout: one workout, its exercises and
--      sets, in the order sent.
do $$
declare
  sent uuid;
  workouts_count bigint;
  exercises_count bigint;
  sets_count bigint;
  bench_entry uuid;
begin
  sent := public.submit_workout(jsonb_build_object(
    'id', 'aaaaaaaa-0000-4000-8000-000000000001',
    'routine_id', current_setting('test.a_routine'),
    'started_at', '2026-11-02T09:00:00Z',
    'finished_at', '2026-11-02T10:05:00Z',
    'exercises', jsonb_build_array(
      jsonb_build_object('exercise_id', current_setting('test.a_bench'), 'sets', jsonb_build_array(
        jsonb_build_object('weight_kg', 80, 'reps', 8),
        jsonb_build_object('weight_kg', 82.5, 'reps', 6)
      )),
      jsonb_build_object('exercise_id', current_setting('test.a_squat'), 'sets', jsonb_build_array(
        jsonb_build_object('weight_kg', 100, 'reps', 5)
      ))
    )
  ));
  if sent is distinct from 'aaaaaaaa-0000-4000-8000-000000000001' then
    raise exception 'FAIL 3.12: submit_workout returned %', sent;
  end if;

  select count(*) into workouts_count from public.workouts;
  select count(*) into exercises_count from public.workout_exercises;
  select count(*) into sets_count from public.workout_sets;
  if (workouts_count, exercises_count, sets_count) <> (1, 2, 3) then
    raise exception 'FAIL 3.12: expected 1 workout, 2 exercises, 3 sets; got %, %, %', workouts_count, exercises_count, sets_count;
  end if;

  select id into bench_entry from public.workout_exercises
  where workout_id = sent and exercise_id = current_setting('test.a_bench')::uuid and position = 0;
  if bench_entry is null or not exists (
    select 1 from public.workout_exercises
    where workout_id = sent and exercise_id = current_setting('test.a_squat')::uuid and position = 1
  ) then
    raise exception 'FAIL 3.12: the exercises are not in the order sent';
  end if;

  if not exists (select 1 from public.workout_sets where workout_exercise_id = bench_entry and position = 0 and weight_kg = 80 and reps = 8)
    or not exists (select 1 from public.workout_sets where workout_exercise_id = bench_entry and position = 1 and weight_kg = 82.5 and reps = 6) then
    raise exception 'FAIL 3.12: the sets are not stored as sent';
  end if;

  perform set_config('test.a_workout', sent::text, true);

  -- The base of the payloads below: A's routine and a valid one-hour window.
  perform set_config('test.base', jsonb_build_object(
    'routine_id', current_setting('test.a_routine'),
    'started_at', '2026-11-02T18:00:00Z',
    'finished_at', '2026-11-02T19:00:00Z'
  )::text, true);
end $$;

-- 3.13 Sending the same workout again returns the same id and stores nothing,
--      even with different content.
do $$
declare
  sent uuid;
  workouts_count bigint;
  exercises_count bigint;
  sets_count bigint;
begin
  sent := public.submit_workout(
    current_setting('test.base')::jsonb || jsonb_build_object(
      'id', current_setting('test.a_workout'),
      'exercises', jsonb_build_array(jsonb_build_object(
        'exercise_id', current_setting('test.a_bench'),
        'sets', jsonb_build_array(jsonb_build_object('weight_kg', 999, 'reps', 1))
      ))
    )
  );
  if sent is distinct from current_setting('test.a_workout')::uuid then
    raise exception 'FAIL 3.13: sending again returned %', sent;
  end if;

  select count(*) into workouts_count from public.workouts;
  select count(*) into exercises_count from public.workout_exercises;
  select count(*) into sets_count from public.workout_sets;
  if (workouts_count, exercises_count, sets_count) <> (1, 2, 3) or exists (select 1 from public.workout_sets where weight_kg = 999) then
    raise exception 'FAIL 3.13: sending again changed the data (%, %, %)', workouts_count, exercises_count, sets_count;
  end if;
end $$;

-- 3.14–3.17 submit_workout error cases. Each must fail as a whole.
do $$
declare
  c record;
  got text;
  workouts_count bigint;
  exercises_count bigint;
  sets_count bigint;
begin
  for c in
    select * from (values
      -- 3.14 All or nothing: the second exercise is B's, so the first is not kept either.
      ('3.14 second exercise is B''s', $s$select public.submit_workout(current_setting('test.base')::jsonb || jsonb_build_object('id', 'aaaaaaaa-0000-4000-8000-000000000002', 'exercises', jsonb_build_array(jsonb_build_object('exercise_id', current_setting('test.a_bench'), 'sets', '[{"weight_kg": 50, "reps": 5}]'::jsonb), jsonb_build_object('exercise_id', current_setting('test.b_exercise'), 'sets', '[{"weight_kg": 50, "reps": 5}]'::jsonb))))$s$, '23503'),
      ('3.14 B''s routine', $s$select public.submit_workout(current_setting('test.base')::jsonb || jsonb_build_object('id', gen_random_uuid(), 'routine_id', current_setting('test.b_routine'), 'exercises', jsonb_build_array(jsonb_build_object('exercise_id', current_setting('test.a_bench'), 'sets', '[{"weight_kg": 50, "reps": 5}]'::jsonb))))$s$, '23503'),
      -- 3.15 Shape of the payload.
      ('3.15 not an object', $s$select public.submit_workout('[]'::jsonb)$s$, '22023'),
      ('3.15 no exercises array', $s$select public.submit_workout(current_setting('test.base')::jsonb || jsonb_build_object('id', gen_random_uuid()))$s$, '22023'),
      ('3.15 no exercises', $s$select public.submit_workout(current_setting('test.base')::jsonb || jsonb_build_object('id', gen_random_uuid(), 'exercises', '[]'::jsonb))$s$, '22023'),
      ('3.15 31 exercises', $s$select public.submit_workout(current_setting('test.base')::jsonb || jsonb_build_object('id', gen_random_uuid(), 'exercises', (select jsonb_agg(jsonb_build_object('exercise_id', gen_random_uuid(), 'sets', '[{"weight_kg": 50, "reps": 5}]'::jsonb)) from generate_series(1, 31))))$s$, '22023'),
      ('3.15 exercise without a sets array', $s$select public.submit_workout(current_setting('test.base')::jsonb || jsonb_build_object('id', gen_random_uuid(), 'exercises', jsonb_build_array(jsonb_build_object('exercise_id', current_setting('test.a_bench')))))$s$, '22023'),
      ('3.15 exercise with no sets', $s$select public.submit_workout(current_setting('test.base')::jsonb || jsonb_build_object('id', gen_random_uuid(), 'exercises', jsonb_build_array(jsonb_build_object('exercise_id', current_setting('test.a_bench'), 'sets', '[]'::jsonb))))$s$, '22023'),
      ('3.15 exercise with 21 sets', $s$select public.submit_workout(current_setting('test.base')::jsonb || jsonb_build_object('id', gen_random_uuid(), 'exercises', jsonb_build_array(jsonb_build_object('exercise_id', current_setting('test.a_bench'), 'sets', (select jsonb_agg(jsonb_build_object('weight_kg', 50, 'reps', 5)) from generate_series(1, 21))))))$s$, '22023'),
      ('3.15 missing routine', $s$select public.submit_workout((current_setting('test.base')::jsonb - 'routine_id') || jsonb_build_object('id', gen_random_uuid(), 'exercises', jsonb_build_array(jsonb_build_object('exercise_id', current_setting('test.a_bench'), 'sets', '[{"weight_kg": 50, "reps": 5}]'::jsonb))))$s$, '23502'),
      ('3.15 id that is not a uuid', $s$select public.submit_workout(current_setting('test.base')::jsonb || jsonb_build_object('id', 'not-a-uuid', 'exercises', jsonb_build_array(jsonb_build_object('exercise_id', current_setting('test.a_bench'), 'sets', '[{"weight_kg": 50, "reps": 5}]'::jsonb))))$s$, '22P02'),
      -- 3.16 Limits on sets, times and exercises.
      ('3.16 weight of 0', $s$select public.submit_workout(current_setting('test.base')::jsonb || jsonb_build_object('id', gen_random_uuid(), 'exercises', jsonb_build_array(jsonb_build_object('exercise_id', current_setting('test.a_bench'), 'sets', '[{"weight_kg": 0, "reps": 5}]'::jsonb))))$s$, '23514'),
      ('3.16 weight of 1000.01', $s$select public.submit_workout(current_setting('test.base')::jsonb || jsonb_build_object('id', gen_random_uuid(), 'exercises', jsonb_build_array(jsonb_build_object('exercise_id', current_setting('test.a_bench'), 'sets', '[{"weight_kg": 1000.01, "reps": 5}]'::jsonb))))$s$, '23514'),
      ('3.16 0 reps', $s$select public.submit_workout(current_setting('test.base')::jsonb || jsonb_build_object('id', gen_random_uuid(), 'exercises', jsonb_build_array(jsonb_build_object('exercise_id', current_setting('test.a_bench'), 'sets', '[{"weight_kg": 50, "reps": 0}]'::jsonb))))$s$, '23514'),
      ('3.16 101 reps', $s$select public.submit_workout(current_setting('test.base')::jsonb || jsonb_build_object('id', gen_random_uuid(), 'exercises', jsonb_build_array(jsonb_build_object('exercise_id', current_setting('test.a_bench'), 'sets', '[{"weight_kg": 50, "reps": 101}]'::jsonb))))$s$, '23514'),
      ('3.16 finished before started', $s$select public.submit_workout(current_setting('test.base')::jsonb || jsonb_build_object('id', gen_random_uuid(), 'started_at', '2026-11-02T19:00:00Z', 'finished_at', '2026-11-02T18:00:00Z', 'exercises', jsonb_build_array(jsonb_build_object('exercise_id', current_setting('test.a_bench'), 'sets', '[{"weight_kg": 50, "reps": 5}]'::jsonb))))$s$, '23514'),
      ('3.16 longer than 24 hours', $s$select public.submit_workout(current_setting('test.base')::jsonb || jsonb_build_object('id', gen_random_uuid(), 'started_at', '2026-11-01T18:00:00Z', 'finished_at', '2026-11-02T19:00:00Z', 'exercises', jsonb_build_array(jsonb_build_object('exercise_id', current_setting('test.a_bench'), 'sets', '[{"weight_kg": 50, "reps": 5}]'::jsonb))))$s$, '23514'),
      ('3.16 same exercise twice in a workout', $s$select public.submit_workout(current_setting('test.base')::jsonb || jsonb_build_object('id', gen_random_uuid(), 'exercises', jsonb_build_array(jsonb_build_object('exercise_id', current_setting('test.a_bench'), 'sets', '[{"weight_kg": 50, "reps": 5}]'::jsonb), jsonb_build_object('exercise_id', current_setting('test.a_bench'), 'sets', '[{"weight_kg": 50, "reps": 5}]'::jsonb))))$s$, '23505'),
      -- 3.17 B's workout id, sent by A: refused, not reported as already received.
      ('3.17 B''s workout id', $s$select public.submit_workout(current_setting('test.base')::jsonb || jsonb_build_object('id', current_setting('test.b_workout'), 'exercises', jsonb_build_array(jsonb_build_object('exercise_id', current_setting('test.a_bench'), 'sets', '[{"weight_kg": 50, "reps": 5}]'::jsonb))))$s$, '23505')
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

  -- Nothing from the failed sends was kept.
  select count(*) into workouts_count from public.workouts;
  select count(*) into exercises_count from public.workout_exercises;
  select count(*) into sets_count from public.workout_sets;
  if (workouts_count, exercises_count, sets_count) <> (1, 2, 3)
    or exists (select 1 from public.workouts where id = 'aaaaaaaa-0000-4000-8000-000000000002') then
    raise exception 'FAIL 3.14: a failed send left data behind (%, %, %)', workouts_count, exercises_count, sets_count;
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
  foreach t in array array['exercises', 'routines', 'routine_exercises', 'workouts', 'workout_exercises', 'workout_sets'] loop
    execute format('select count(*) from public.%I where user_id <> %L', t, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    into foreign_rows;
    if foreign_rows <> 0 then
      raise exception 'FAIL 4.1: B sees % of A''s rows in %', foreign_rows, t;
    end if;
  end loop;

  if not exists (select 1 from public.exercises where id = current_setting('test.b_exercise')::uuid and name = 'Supino')
    or not exists (select 1 from public.routines where id = current_setting('test.b_routine')::uuid and name = 'Rotina B')
    or not exists (select 1 from public.routine_exercises where id = current_setting('test.b_routine_exercise')::uuid and target_sets = 3)
    or (select count(*) from public.workouts) <> 1
    or not exists (select 1 from public.workout_sets where workout_exercise_id = current_setting('test.b_workout_exercise')::uuid and weight_kg = 60 and reps = 10) then
    raise exception 'FAIL 4.2: B''s data changed';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Deleting a user deletes all their gym data, and nothing of anyone else's.
--    Run as postgres (the table owner, which RLS does not apply to).
-- ---------------------------------------------------------------------------
reset role;

-- A has rows in all six tables before the delete, so "none left" means something.
do $$
declare
  t text;
  existing bigint;
begin
  foreach t in array array['exercises', 'routines', 'routine_exercises', 'workouts', 'workout_exercises', 'workout_sets'] loop
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
  foreach t in array array['exercises', 'routines', 'routine_exercises', 'workouts', 'workout_exercises', 'workout_sets'] loop
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

select 'All gym checks passed' as result;
