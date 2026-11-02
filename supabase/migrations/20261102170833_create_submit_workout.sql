-- Sends a finished workout in one operation (see docs/decisions.md, Gym module).
--
-- Called from the app as supabase.rpc('submit_workout', { workout }), with:
--   {
--     "id": "<uuid created on the device when the workout started>",
--     "routine_id": "<uuid>",
--     "started_at": "<timestamptz>",
--     "finished_at": "<timestamptz>",
--     "exercises": [
--       { "exercise_id": "<uuid>", "sets": [ { "weight_kg": 80, "reps": 8 } ] }
--     ]
--   }
-- Positions come from the order of the arrays. Skipped exercises are not sent.
--
-- All or nothing: a function runs in a single transaction, so if any insert
-- fails (another user's exercise, a limit, a missing set) nothing is kept.
--
-- Idempotent: the workout id comes from the device. Sending the same workout
-- again (after a network failure) inserts nothing and returns the same id.
-- Since the first send was all or nothing, an existing workout row means its
-- exercises and sets exist too.
--
-- security invoker: it runs as the signed-in user, so RLS, the column grants
-- and the composite foreign keys all apply inside it, with no checks of its own
-- needed for ownership.

create function public.submit_workout(workout jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_workout_id uuid;
  exercise jsonb;
  exercise_position bigint;
  new_workout_exercise_id uuid;
begin
  -- Separate ifs: SQL does not guarantee the order in which "or" is evaluated,
  -- and jsonb_array_length fails on anything that is not an array.
  if jsonb_typeof(workout) is distinct from 'object' then
    raise exception 'submit_workout: expected an object'
      using errcode = '22023';
  end if;
  if jsonb_typeof(workout -> 'exercises') is distinct from 'array' then
    raise exception 'submit_workout: expected an exercises array'
      using errcode = '22023';
  end if;
  if jsonb_array_length(workout -> 'exercises') not between 1 and 30 then
    raise exception 'submit_workout: a workout has 1 to 30 exercises'
      using errcode = '22023';
  end if;

  new_workout_id := (workout ->> 'id')::uuid;

  insert into public.workouts (id, routine_id, started_at, finished_at)
  values (
    new_workout_id,
    (workout ->> 'routine_id')::uuid,
    (workout ->> 'started_at')::timestamptz,
    (workout ->> 'finished_at')::timestamptz
  )
  on conflict (id) do nothing;

  if not found then
    -- Already received: RLS only shows the user's own workouts, so this is
    -- true only when the existing workout is theirs.
    if exists (select 1 from public.workouts w where w.id = new_workout_id) then
      return new_workout_id;
    end if;
    raise exception 'submit_workout: this workout id is already in use'
      using errcode = '23505';
  end if;

  for exercise, exercise_position in
    select e.value, e.ordinality - 1
    from jsonb_array_elements(workout -> 'exercises') with ordinality as e(value, ordinality)
  loop
    if jsonb_typeof(exercise -> 'sets') is distinct from 'array' then
      raise exception 'submit_workout: expected a sets array for each exercise'
        using errcode = '22023';
    end if;
    if jsonb_array_length(exercise -> 'sets') not between 1 and 20 then
      raise exception 'submit_workout: each exercise has 1 to 20 sets'
        using errcode = '22023';
    end if;

    insert into public.workout_exercises (workout_id, exercise_id, position)
    values (new_workout_id, (exercise ->> 'exercise_id')::uuid, exercise_position)
    returning id into new_workout_exercise_id;

    insert into public.workout_sets (workout_exercise_id, position, weight_kg, reps)
    select
      new_workout_exercise_id,
      s.ordinality - 1,
      (s.value ->> 'weight_kg')::numeric,
      (s.value ->> 'reps')::smallint
    from jsonb_array_elements(exercise -> 'sets') with ordinality as s(value, ordinality);
  end loop;

  return new_workout_id;
end;
$$;

-- Functions in this project are not executable by public by default; this is
-- explicit so the migration is correct on any project. Nothing for anon.
revoke execute on function public.submit_workout(jsonb) from public, anon;
grant execute on function public.submit_workout(jsonb) to authenticated;
