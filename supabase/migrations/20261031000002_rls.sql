-- Row Level Security (SPEC.md, "RLS").
-- Every table has RLS enabled; anon gets nothing. auth.uid() is wrapped in a
-- subselect so Postgres evaluates it once per statement instead of per row.

alter table profiles enable row level security;
alter table exercises enable row level security;
alter table workout_templates enable row level security;
alter table template_exercises enable row level security;
alter table template_exercise_alternatives enable row level security;
alter table workout_sessions enable row level security;
alter table session_exercises enable row level security;
alter table session_sets enable row level security;
alter table goals enable row level security;
alter table goal_day_templates enable row level security;
alter table challenges enable row level security;

-- Ownership helpers. security invoker: they run under the caller's RLS, so
-- "exists" is true only for rows the caller is allowed to see.
create function public.is_visible_exercise(p_exercise_id uuid)
returns boolean
language sql stable security invoker set search_path = ''
as $$
  select exists (select 1 from public.exercises e where e.id = p_exercise_id)
$$;

create function public.owns_template(p_template_id uuid)
returns boolean
language sql stable security invoker set search_path = ''
as $$
  select exists (
    select 1 from public.workout_templates t
    where t.id = p_template_id and t.user_id = (select auth.uid())
  )
$$;

create function public.owns_template_exercise(p_template_exercise_id uuid)
returns boolean
language sql stable security invoker set search_path = ''
as $$
  select exists (
    select 1 from public.template_exercises te
    join public.workout_templates t on t.id = te.template_id
    where te.id = p_template_exercise_id and t.user_id = (select auth.uid())
  )
$$;

create function public.owns_session(p_session_id uuid)
returns boolean
language sql stable security invoker set search_path = ''
as $$
  select exists (
    select 1 from public.workout_sessions s
    where s.id = p_session_id and s.user_id = (select auth.uid())
  )
$$;

create function public.owns_session_exercise(p_session_exercise_id uuid)
returns boolean
language sql stable security invoker set search_path = ''
as $$
  select exists (
    select 1 from public.session_exercises se
    join public.workout_sessions s on s.id = se.session_id
    where se.id = p_session_exercise_id and s.user_id = (select auth.uid())
  )
$$;

create function public.owns_goal(p_goal_id uuid)
returns boolean
language sql stable security invoker set search_path = ''
as $$
  select exists (
    select 1 from public.goals g
    where g.id = p_goal_id and g.user_id = (select auth.uid())
  )
$$;

-- profiles: own row only.
create policy "profiles: own" on profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- exercises: read built-in + own; write own only (built-ins are read-only).
create policy "exercises: read built-in and own" on exercises
  for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));
create policy "exercises: insert own" on exercises
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "exercises: update own" on exercises
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "exercises: delete own" on exercises
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Tables with user_id: own rows only.
create policy "workout_templates: own" on workout_templates
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "workout_sessions: own" on workout_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (template_id is null or public.owns_template(template_id))
  );

create policy "goals: own" on goals
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "challenges: own" on challenges
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Child tables: access derives from owning the parent row. Writes may only
-- reference exercises the user can see (built-in or own).
create policy "template_exercises: via template" on template_exercises
  for all to authenticated
  using (public.owns_template(template_id))
  with check (public.owns_template(template_id) and public.is_visible_exercise(exercise_id));

create policy "template_exercise_alternatives: via template" on template_exercise_alternatives
  for all to authenticated
  using (public.owns_template_exercise(template_exercise_id))
  with check (
    public.owns_template_exercise(template_exercise_id)
    and public.is_visible_exercise(exercise_id)
  );

create policy "session_exercises: via session" on session_exercises
  for all to authenticated
  using (public.owns_session(session_id))
  with check (
    public.owns_session(session_id)
    and public.is_visible_exercise(exercise_id)
    and (replaced_exercise_id is null or public.is_visible_exercise(replaced_exercise_id))
  );

create policy "session_sets: via session" on session_sets
  for all to authenticated
  using (public.owns_session_exercise(session_exercise_id))
  with check (public.owns_session_exercise(session_exercise_id));

create policy "goal_day_templates: via goal" on goal_day_templates
  for all to authenticated
  using (public.owns_goal(goal_id))
  with check (public.owns_goal(goal_id) and public.owns_template(template_id));
