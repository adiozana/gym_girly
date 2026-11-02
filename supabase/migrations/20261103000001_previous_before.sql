-- Stage 4: "previous performance" relative to a point in time. The summary of an older
-- workout compares with the workout BEFORE it, not with the latest one (SPEC.md "סיכום אימון").
drop function public.previous_performance(uuid[], uuid);

create function public.previous_performance(
  p_exercise_ids uuid[],
  p_exclude_session_id uuid default null,
  p_before timestamptz default null
)
returns table (
  exercise_id uuid,
  session_id uuid,
  started_at timestamptz,
  note text,
  set_number int,
  weight_kg numeric,
  reps int
)
language sql stable security invoker set search_path = ''
as $$
  with latest as (
    select distinct on (se.exercise_id)
      se.exercise_id, se.id as session_exercise_id, se.note, s.id as session_id, s.started_at
    from public.session_exercises se
    join public.workout_sessions s on s.id = se.session_id
    where s.status = 'completed'
      and se.exercise_id = any (p_exercise_ids)
      and s.id is distinct from p_exclude_session_id
      and (p_before is null or s.started_at < p_before)
    order by se.exercise_id, s.started_at desc, se.position
  )
  select l.exercise_id, l.session_id, l.started_at, l.note, ss.set_number, ss.weight_kg, ss.reps
  from latest l
  join public.session_sets ss on ss.session_exercise_id = l.session_exercise_id and ss.is_done
  order by l.exercise_id, ss.set_number;
$$;
