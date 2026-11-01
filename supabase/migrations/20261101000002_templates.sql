-- Exercise library and workout templates (SPEC.md stage 2).
-- Multi-row operations live in functions so each one is atomic. All functions are
-- security invoker: they run under the caller's RLS, so users can only touch their own rows.

-- Rep range is optional; when set, both ends are sane and min <= max.
alter table template_exercises add constraint template_exercises_rep_range_check check (
  (rep_range_min is null or rep_range_min between 1 and 999)
  and (rep_range_max is null or rep_range_max between 1 and 999)
  and (rep_range_min is null or rep_range_max is null or rep_range_min <= rep_range_max)
);

-- Copies a template with its exercises and alternatives. Returns the new template id.
create function public.duplicate_template(p_template_id uuid, p_name text)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_new_id uuid;
  v_source record;
  v_new_te_id uuid;
begin
  insert into public.workout_templates (user_id, name)
  select t.user_id, p_name from public.workout_templates t
  where t.id = p_template_id and t.user_id = (select auth.uid())
  returning id into v_new_id;

  if v_new_id is null then
    raise exception 'template % not found', p_template_id using errcode = 'P0002';
  end if;

  for v_source in
    select * from public.template_exercises where template_id = p_template_id order by position
  loop
    insert into public.template_exercises
      (template_id, exercise_id, position, planned_sets, rep_range_min, rep_range_max, note)
    values
      (v_new_id, v_source.exercise_id, v_source.position, v_source.planned_sets,
       v_source.rep_range_min, v_source.rep_range_max, v_source.note)
    returning id into v_new_te_id;

    insert into public.template_exercise_alternatives (template_exercise_id, exercise_id, position)
    select v_new_te_id, a.exercise_id, a.position
    from public.template_exercise_alternatives a
    where a.template_exercise_id = v_source.id;
  end loop;

  return v_new_id;
end;
$$;

-- Sets positions 1..n from the given order. p_ids must be exactly the template's exercises.
create function public.reorder_template_exercises(p_template_id uuid, p_ids uuid[])
returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if (select count(*) from public.template_exercises where template_id = p_template_id)
       <> cardinality(p_ids)
     or exists (
       select 1 from unnest(p_ids) as i(id)
       where not exists (
         select 1 from public.template_exercises te
         where te.id = i.id and te.template_id = p_template_id
       )
     )
  then
    raise exception 'ids do not match the template exercises' using errcode = '22023';
  end if;

  update public.template_exercises te
  set position = o.ord
  from unnest(p_ids) with ordinality as o(id, ord)
  where te.id = o.id;
end;
$$;

-- Same contract for the alternatives of one template exercise.
create function public.reorder_template_alternatives(p_template_exercise_id uuid, p_ids uuid[])
returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if (select count(*) from public.template_exercise_alternatives
      where template_exercise_id = p_template_exercise_id) <> cardinality(p_ids)
     or exists (
       select 1 from unnest(p_ids) as i(id)
       where not exists (
         select 1 from public.template_exercise_alternatives a
         where a.id = i.id and a.template_exercise_id = p_template_exercise_id
       )
     )
  then
    raise exception 'ids do not match the alternatives' using errcode = '22023';
  end if;

  update public.template_exercise_alternatives a
  set position = o.ord
  from unnest(p_ids) with ordinality as o(id, ord)
  where a.id = o.id;
end;
$$;

-- Archives a template and removes it from any goal weekday (SPEC.md edge cases).
-- Returns how many weekday assignments were removed, so the UI can say so.
create function public.archive_template(p_template_id uuid)
returns integer
language plpgsql security invoker set search_path = ''
as $$
declare
  v_removed integer;
begin
  update public.workout_templates set is_archived = true where id = p_template_id;
  if not found then
    raise exception 'template % not found', p_template_id using errcode = 'P0002';
  end if;

  with deleted as (
    delete from public.goal_day_templates where template_id = p_template_id returning 1
  )
  select count(*) into v_removed from deleted;

  return v_removed;
end;
$$;

-- True when an exercise appears in any template, alternative or session of the caller.
-- Used exercises can only be archived, never deleted (SPEC.md).
create function public.exercise_in_use(p_exercise_id uuid)
returns boolean
language sql stable security invoker set search_path = ''
as $$
  select exists (select 1 from public.template_exercises where exercise_id = p_exercise_id)
      or exists (select 1 from public.template_exercise_alternatives where exercise_id = p_exercise_id)
      or exists (
        select 1 from public.session_exercises
        where exercise_id = p_exercise_id or replaced_exercise_id = p_exercise_id
      )
$$;

-- Lookups for alternatives and "where is this exercise used".
create index template_exercise_alternatives_exercise_idx on template_exercise_alternatives (exercise_id);
create index template_exercises_exercise_idx on template_exercises (exercise_id);
create index session_exercises_replaced_idx on session_exercises (replaced_exercise_id);
