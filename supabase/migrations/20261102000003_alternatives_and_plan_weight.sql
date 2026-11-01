-- Product change after stage 3 (SPEC.md, decided with Adi):
-- 1. Alternatives belong to the exercise in the library (2 fixed per exercise), not to a plan.
-- 2. A plan keeps a current weight per exercise, updated automatically when a workout is saved.
-- 3. The workout logs one weight and reps per exercise: one call writes all of its sets.
-- All functions are security invoker: they run under the caller's RLS.

-- ---------------------------------------------------------------------------
-- Per-plan alternatives are gone
-- ---------------------------------------------------------------------------
drop function public.reorder_template_alternatives(uuid, uuid[]);
drop table public.template_exercise_alternatives;

-- ---------------------------------------------------------------------------
-- exercise_alternatives: two fixed alternatives per exercise
-- ---------------------------------------------------------------------------
create table exercise_alternatives (
  exercise_id uuid not null references exercises on delete cascade,
  alternative_exercise_id uuid not null references exercises on delete cascade,
  position int not null check (position between 1 and 2),
  primary key (exercise_id, position),
  unique (exercise_id, alternative_exercise_id),
  check (exercise_id <> alternative_exercise_id)
);
create index exercise_alternatives_alternative_idx on exercise_alternatives (alternative_exercise_id);

alter table exercise_alternatives enable row level security;

create function public.owns_exercise(p_exercise_id uuid)
returns boolean
language sql stable security invoker set search_path = ''
as $$
  select exists (
    select 1 from public.exercises e
    where e.id = p_exercise_id and e.user_id = (select auth.uid())
  )
$$;

-- Read: whenever the exercise itself is visible (built-in or own). Write: only for the user's
-- own exercises (built-ins' alternatives come from the seed), pointing at visible exercises.
create policy "exercise_alternatives: read with exercise" on exercise_alternatives
  for select to authenticated
  using (public.is_visible_exercise(exercise_id));
create policy "exercise_alternatives: insert own" on exercise_alternatives
  for insert to authenticated
  with check (public.owns_exercise(exercise_id) and public.is_visible_exercise(alternative_exercise_id));
create policy "exercise_alternatives: update own" on exercise_alternatives
  for update to authenticated
  using (public.owns_exercise(exercise_id))
  with check (public.owns_exercise(exercise_id) and public.is_visible_exercise(alternative_exercise_id));
create policy "exercise_alternatives: delete own" on exercise_alternatives
  for delete to authenticated
  using (public.owns_exercise(exercise_id));

-- Replaces a personal exercise's alternatives with p_ids, in order (at most 2).
create function public.set_exercise_alternatives(p_exercise_id uuid, p_ids uuid[])
returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if not public.owns_exercise(p_exercise_id) then
    raise exception 'exercise % not found', p_exercise_id using errcode = 'P0002';
  end if;
  if coalesce(cardinality(p_ids), 0) > 2 then
    raise exception 'at most 2 alternatives' using errcode = '22023';
  end if;

  delete from public.exercise_alternatives where exercise_id = p_exercise_id;
  insert into public.exercise_alternatives (exercise_id, alternative_exercise_id, position)
  select p_exercise_id, a.id, a.ord::int from unnest(p_ids) with ordinality as a(id, ord);
end;
$$;

-- ---------------------------------------------------------------------------
-- Plan: current weight per exercise
-- ---------------------------------------------------------------------------
alter table template_exercises
  add column target_weight_kg numeric(6,2) check (target_weight_kg >= 0);

-- Copies a template with its exercises and their settings, including the current weight.
create or replace function public.duplicate_template(p_template_id uuid, p_name text)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_new_id uuid;
begin
  insert into public.workout_templates (user_id, name)
  select t.user_id, p_name from public.workout_templates t
  where t.id = p_template_id and t.user_id = (select auth.uid())
  returning id into v_new_id;

  if v_new_id is null then
    raise exception 'template % not found', p_template_id using errcode = 'P0002';
  end if;

  insert into public.template_exercises
    (template_id, exercise_id, position, planned_sets, rep_range_min, rep_range_max, note, target_weight_kg)
  select v_new_id, exercise_id, position, planned_sets, rep_range_min, rep_range_max, note, target_weight_kg
  from public.template_exercises where template_id = p_template_id;

  return v_new_id;
end;
$$;

-- An exercise is "in use" (so it can only be archived) when a template or a session uses it.
-- Being someone's alternative doesn't count: those rows cascade away.
create or replace function public.exercise_in_use(p_exercise_id uuid)
returns boolean
language sql stable security invoker set search_path = ''
as $$
  select exists (select 1 from public.template_exercises where exercise_id = p_exercise_id)
      or exists (
        select 1 from public.session_exercises
        where exercise_id = p_exercise_id or replaced_exercise_id = p_exercise_id
      )
$$;

-- Saves an in-progress session (SPEC.md "שמירת אימון"): drops sets not marked done and
-- exercises left without a done set, renumbers the remaining sets 1..n, updates the plan's
-- current weight, and marks it completed. Returns false (changing nothing) when no set was done.
--
-- Plan weight: for every exercise that came from the plan and was not swapped, the heaviest
-- done weight becomes the plan's target_weight_kg. Exercises done without a weight leave it.
create or replace function public.complete_session(p_session_id uuid)
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

  update public.template_exercises te
  set target_weight_kg = w.max_weight
  from (
    select se.template_exercise_id, se.exercise_id, max(ss.weight_kg) as max_weight
    from public.session_exercises se
    join public.session_sets ss on ss.session_exercise_id = se.id
    where se.session_id = p_session_id
      and se.template_exercise_id is not null
      and se.replaced_exercise_id is null
      and ss.is_done and ss.weight_kg is not null
    group by se.template_exercise_id, se.exercise_id
  ) w
  where te.id = w.template_exercise_id and te.exercise_id = w.exercise_id;

  update public.workout_sessions
  set status = 'completed', completed_at = now()
  where id = p_session_id;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Workout: one weight and reps per exercise
-- ---------------------------------------------------------------------------

-- Writes all sets of one session exercise in one go: p_set_ids are its sets in order (set
-- numbers 1..n), all with the same weight, reps and done state. Sets of the exercise not in
-- the list are deleted. Ids are generated by the client, so replaying the call is harmless.
create function public.save_session_exercise_sets(
  p_session_exercise_id uuid,
  p_set_ids uuid[],
  p_weight_kg numeric,
  p_reps int,
  p_is_done boolean
)
returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if coalesce(cardinality(p_set_ids), 0) not between 1 and 20 then
    raise exception 'an exercise has 1 to 20 sets' using errcode = '22023';
  end if;
  if p_is_done and coalesce(p_reps, 0) < 1 then
    raise exception 'a done set needs at least one rep' using errcode = '22023';
  end if;
  if not exists (select 1 from public.session_exercises where id = p_session_exercise_id) then
    raise exception 'session exercise % not found', p_session_exercise_id using errcode = 'P0002';
  end if;

  delete from public.session_sets
  where session_exercise_id = p_session_exercise_id and id <> all (p_set_ids);

  -- Negative numbers first, so (session_exercise_id, set_number) never collides while renumbering.
  update public.session_sets set set_number = -set_number
  where session_exercise_id = p_session_exercise_id;

  insert into public.session_sets as ss (id, session_exercise_id, set_number, weight_kg, reps, is_done)
  select s.id, p_session_exercise_id, s.ord::int, p_weight_kg, p_reps, p_is_done
  from unnest(p_set_ids) with ordinality as s(id, ord)
  on conflict (id) do update
    set set_number = excluded.set_number,
        weight_kg = excluded.weight_kg,
        reps = excluded.reps,
        is_done = excluded.is_done
    where ss.session_exercise_id = excluded.session_exercise_id;
end;
$$;
