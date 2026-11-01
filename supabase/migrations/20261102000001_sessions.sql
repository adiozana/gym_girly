-- Active workout (SPEC.md stage 3). All functions are security invoker: they run under the
-- caller's RLS, so a user can only start, edit or finish their own sessions.

-- Starts a session. From a template: snapshots the name and copies every exercise with
-- `planned_sets` empty sets. Without a template: an empty free workout.
-- p_session_date is the device's local date (SPEC.md: dates follow the browser time zone).
-- A second in-progress session violates one_active_session (23505).
create function public.start_session(p_template_id uuid, p_session_date date)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_session_id uuid;
  v_name text;
  v_te record;
  v_se_id uuid;
begin
  if p_template_id is not null then
    select name into v_name from public.workout_templates
    where id = p_template_id and user_id = (select auth.uid());
    if v_name is null then
      raise exception 'template % not found', p_template_id using errcode = 'P0002';
    end if;
  end if;

  insert into public.workout_sessions (user_id, template_id, template_name, session_date)
  values ((select auth.uid()), p_template_id, v_name, p_session_date)
  returning id into v_session_id;

  for v_te in
    select id, exercise_id, position, planned_sets from public.template_exercises
    where template_id = p_template_id order by position
  loop
    insert into public.session_exercises (session_id, exercise_id, template_exercise_id, position)
    values (v_session_id, v_te.exercise_id, v_te.id, v_te.position)
    returning id into v_se_id;

    insert into public.session_sets (session_exercise_id, set_number)
    select v_se_id, n from generate_series(1, v_te.planned_sets) as n;
  end loop;

  return v_session_id;
end;
$$;

-- Saves an in-progress session (SPEC.md "שמירת אימון"): drops sets not marked done and
-- exercises left without a done set, renumbers the remaining sets 1..n, and marks it
-- completed. Returns false (changing nothing) when no set was done: such a session is not saved.
create function public.complete_session(p_session_id uuid)
returns boolean
language plpgsql security invoker set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.workout_sessions
    where id = p_session_id and status = 'in_progress'
  ) then
    raise exception 'session % not found or not in progress', p_session_id using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.session_sets ss
    join public.session_exercises se on se.id = ss.session_exercise_id
    where se.session_id = p_session_id and ss.is_done
  ) then
    return false;
  end if;

  delete from public.session_sets ss
  using public.session_exercises se
  where se.id = ss.session_exercise_id and se.session_id = p_session_id and not ss.is_done;

  delete from public.session_exercises se
  where se.session_id = p_session_id
    and not exists (select 1 from public.session_sets ss where ss.session_exercise_id = se.id);

  perform public.renumber_sets(se.id)
  from public.session_exercises se where se.session_id = p_session_id;

  update public.workout_sessions
  set status = 'completed', completed_at = now()
  where id = p_session_id;

  return true;
end;
$$;

-- Renumbers the sets of one session exercise to 1..n, keeping their order. Goes through
-- negative numbers so the (session_exercise_id, set_number) unique key never collides.
create function public.renumber_sets(p_session_exercise_id uuid)
returns void
language sql security invoker set search_path = ''
as $$
  update public.session_sets set set_number = -set_number
  where session_exercise_id = p_session_exercise_id;

  update public.session_sets ss set set_number = o.n
  from (
    select id, row_number() over (order by -set_number) as n
    from public.session_sets where session_exercise_id = p_session_exercise_id
  ) o
  where ss.id = o.id;
$$;

-- Deletes one set and closes the gap (set 3 becomes set 2), so "previous performance"
-- keeps matching by set number.
create function public.delete_session_set(p_set_id uuid)
returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  v_se_id uuid;
begin
  delete from public.session_sets where id = p_set_id returning session_exercise_id into v_se_id;
  if v_se_id is null then
    raise exception 'set % not found', p_set_id using errcode = 'P0002';
  end if;
  perform public.renumber_sets(v_se_id);
end;
$$;

-- Sets positions 1..n from the given order. p_ids must be exactly the session's exercises.
create function public.reorder_session_exercises(p_session_id uuid, p_ids uuid[])
returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if (select count(*) from public.session_exercises where session_id = p_session_id) <> cardinality(p_ids)
     or exists (
       select 1 from unnest(p_ids) as i(id)
       where not exists (
         select 1 from public.session_exercises se where se.id = i.id and se.session_id = p_session_id
       )
     )
  then
    raise exception 'ids do not match the session exercises' using errcode = '22023';
  end if;

  update public.session_exercises se
  set position = o.ord
  from unnest(p_ids) with ordinality as o(id, ord)
  where se.id = o.id;
end;
$$;

-- Previous performance (SPEC.md "ביצוע קודם"): for each exercise, the done sets of the most
-- recent COMPLETED session (by started_at) where it was performed. In-progress sessions never
-- count. If the exercise appears twice in that session, the first card (lowest position) wins.
create function public.previous_performance(p_exercise_ids uuid[], p_exclude_session_id uuid default null)
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
    order by se.exercise_id, s.started_at desc, se.position
  )
  select l.exercise_id, l.session_id, l.started_at, l.note, ss.set_number, ss.weight_kg, ss.reps
  from latest l
  join public.session_sets ss on ss.session_exercise_id = l.session_exercise_id and ss.is_done
  order by l.exercise_id, ss.set_number;
$$;

-- A user's sessions in history order. (session_sets is already indexed by its unique key.)
create index workout_sessions_user_started_idx on workout_sessions (user_id, started_at desc);
