-- "Última vez": the sets of each given exercise in the most recent finished
-- workout that has it, from any routine (see docs/decisions.md, Gym module).
--
-- Called from the app as supabase.rpc('last_exercise_sets', { exercise_ids }),
-- once, with every exercise of the workout. An exercise with no history returns
-- no rows.
--
-- A function rather than a query through the Data API: only the latest workout
-- of each exercise comes back, in one request. A single query would return each
-- exercise's whole history and could be cut by the API's row limit, dropping the
-- less frequent exercises without an error.
--
-- security invoker: it runs as the signed-in user, so RLS applies inside it and
-- another user's exercise id simply returns nothing.

create function public.last_exercise_sets(exercise_ids uuid[])
returns table (
  exercise_id uuid,
  finished_at timestamptz,
  set_position integer,
  weight_kg numeric,
  reps smallint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with latest as (
    -- w.id only breaks a tie between two workouts finished at the same moment.
    select distinct on (we.exercise_id) we.id, we.exercise_id, w.finished_at
    from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where we.exercise_id = any (exercise_ids)
    order by we.exercise_id, w.finished_at desc, w.id
  )
  select l.exercise_id, l.finished_at, s.position, s.weight_kg, s.reps
  from latest l
  join public.workout_sets s on s.workout_exercise_id = l.id
  order by l.exercise_id, s.position;
$$;

-- Functions in this project are not executable by public by default; this is
-- explicit so the migration is correct on any project. Nothing for anon.
revoke execute on function public.last_exercise_sets(uuid[]) from public, anon;
grant execute on function public.last_exercise_sets(uuid[]) to authenticated;
