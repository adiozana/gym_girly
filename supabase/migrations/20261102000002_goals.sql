-- Goals and challenges (SPEC.md stage 5). Security invoker: the caller's RLS applies.

-- Replaces the active goal (SPEC.md "שינוי מטרה"): the previous goal ends yesterday and the new
-- one starts today, so every past day keeps being judged by the goal that was in effect then.
-- A goal that started today is simply replaced (it would otherwise end before it began).
-- p_day_templates: optional {"<weekday>": "<template uuid>"} for fixed_days; weekdays that are
-- not training days are ignored. p_today is the device's local date.
create function public.set_goal(
  p_type goal_type,
  p_training_weekdays int[],
  p_cycle_on int,
  p_cycle_off int,
  p_day_templates jsonb,
  p_today date
)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_goal_id uuid;
begin
  if p_type = 'fixed_days' and (
    p_training_weekdays is null or cardinality(p_training_weekdays) = 0
    or exists (select 1 from unnest(p_training_weekdays) d where d not between 0 and 6)
  ) then
    raise exception 'fixed_days needs weekdays between 0 and 6' using errcode = '22023';
  end if;

  delete from public.goals
  where user_id = v_user and end_date is null and start_date >= p_today;

  update public.goals set end_date = p_today - 1
  where user_id = v_user and end_date is null;

  insert into public.goals (user_id, type, training_weekdays, cycle_on, cycle_off, start_date)
  values (
    v_user,
    p_type,
    case when p_type = 'fixed_days' then (select array_agg(distinct d order by d) from unnest(p_training_weekdays) d) end,
    case when p_type = 'cycle' then p_cycle_on end,
    case when p_type = 'cycle' then p_cycle_off end,
    p_today
  )
  returning id into v_goal_id;

  if p_type = 'fixed_days' and p_day_templates is not null then
    insert into public.goal_day_templates (goal_id, weekday, template_id)
    select v_goal_id, e.key::int, e.value::uuid
    from jsonb_each_text(p_day_templates) e
    where e.key::int = any (p_training_weekdays);
  end if;

  return v_goal_id;
end;
$$;

-- Starts a challenge (SPEC.md "אתגר"): only with an active goal; one active challenge at most
-- (one_active_challenge raises 23505).
create function public.start_challenge(p_weeks int, p_today date)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not exists (
    select 1 from public.goals where user_id = (select auth.uid()) and end_date is null
  ) then
    raise exception 'an active goal is required' using errcode = 'P0002';
  end if;

  insert into public.challenges (user_id, weeks, start_date)
  values ((select auth.uid()), p_weeks, p_today)
  returning id into v_id;
  return v_id;
end;
$$;
