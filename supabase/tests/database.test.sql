-- Schema, seed and RLS checks. Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

-- ---------------------------------------------------------------------------
-- Schema and seed
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity),
  0,
  'RLS is enabled on every public table'
);

select is(
  (select count(*)::int from public.exercises where user_id is null),
  80,
  'seed loads 80 built-in exercises'
);

select is(
  (select count(distinct muscle_group)::int from public.exercises where user_id is null),
  (select count(*)::int from unnest(enum_range(null::muscle_group))),
  'built-in exercises cover every muscle group'
);

select is(
  (select count(distinct equipment)::int from public.exercises where user_id is null),
  (select count(*)::int from unnest(enum_range(null::equipment))),
  'built-in exercises cover every equipment type'
);

select is(
  (select count(*)::int from public.exercises
   where user_id is null and (name_en is null or coalesce(instructions_he, '') = '')),
  0,
  'every built-in exercise has an English name and Hebrew instructions'
);

-- ---------------------------------------------------------------------------
-- Fixtures: two users, each with a private exercise and a template
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alice@users.gymtracker.local', 'authenticated', 'authenticated', '{"username":"alice"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@users.gymtracker.local', 'authenticated', 'authenticated', '{"username":"bob"}');

select is(
  (select username from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'alice',
  'sign-up creates a profile with the username from user metadata'
);

select throws_ok(
  $$insert into auth.users (id, email, aud, role, raw_user_meta_data)
    values ('33333333-3333-3333-3333-333333333333', 'Bad@users.gymtracker.local', 'authenticated', 'authenticated', '{"username":"Bad Name"}')$$,
  '23514',
  null,
  'sign-up with an invalid username is rejected'
);

select throws_ok(
  $$insert into auth.users (id, email, aud, role)
    values ('44444444-4444-4444-4444-444444444444', 'nobody@users.gymtracker.local', 'authenticated', 'authenticated')$$,
  '23502',
  null,
  'sign-up without a username is rejected'
);

insert into public.exercises (id, user_id, name_he, muscle_group, equipment) values
  ('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'תרגיל של אליס', 'legs', 'other');

insert into public.workout_templates (id, user_id, name) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', '11111111-1111-1111-1111-111111111111', 'Alice legs');

insert into public.template_exercises (id, template_id, exercise_id, position) values
  ('aaaaaaaa-0000-4000-8000-0000000000b1', 'aaaaaaaa-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000040', 1);

insert into public.workout_sessions (id, user_id, template_id, template_name, session_date, status) values
  ('aaaaaaaa-0000-4000-8000-0000000000c1', '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-0000-4000-8000-0000000000a1', 'Alice legs', '2026-10-30', 'completed');

insert into public.session_exercises (id, session_id, exercise_id, position) values
  ('aaaaaaaa-0000-4000-8000-0000000000d1', 'aaaaaaaa-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-000000000040', 1);

insert into public.session_sets (session_exercise_id, set_number, weight_kg, reps, is_done) values
  ('aaaaaaaa-0000-4000-8000-0000000000d1', 1, 40, 8, true);

-- ---------------------------------------------------------------------------
-- Anonymous visitors see nothing
-- ---------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is_empty(
  'select 1 from public.exercises',
  'anon cannot read exercises'
);

-- ---------------------------------------------------------------------------
-- Bob (authenticated) cannot see or touch Alice's data
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.exercises),
  80,
  'bob sees the 80 built-in exercises but not alice''s private one'
);

select results_eq(
  'select username from public.profiles',
  $$values ('bob')$$,
  'bob sees only his own profile'
);

with changed as (
  update public.profiles set username = 'hacked' where id = '11111111-1111-1111-1111-111111111111' returning 1
)
select is((select count(*)::int from changed), 0, 'bob cannot change alice''s profile');

select is_empty('select 1 from public.workout_templates', 'bob cannot see alice''s templates');
select is_empty('select 1 from public.template_exercises', 'bob cannot see alice''s template exercises');
select is_empty('select 1 from public.workout_sessions', 'bob cannot see alice''s sessions');
select is_empty('select 1 from public.session_sets', 'bob cannot see alice''s sets');

select throws_ok(
  $$insert into public.template_exercises (template_id, exercise_id, position)
    values ('aaaaaaaa-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001', 2)$$,
  '42501',
  null,
  'bob cannot add exercises to alice''s template'
);

select throws_ok(
  $$insert into public.workout_templates (user_id, name)
    values ('11111111-1111-1111-1111-111111111111', 'sneaky')$$,
  '42501',
  null,
  'bob cannot create a template owned by alice'
);

update public.exercises set name_he = 'שונה' where id = '00000000-0000-4000-8000-000000000001';
reset role;
select is(
  (select name_he from public.exercises where id = '00000000-0000-4000-8000-000000000001'),
  'לחיצת חזה במוט',
  'built-in exercises cannot be edited by users'
);

-- Bob's own template: he can use built-ins, but not alice's private exercise.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

insert into public.workout_templates (id, user_id, name)
  values ('bbbbbbbb-0000-4000-8000-0000000000a1', '22222222-2222-2222-2222-222222222222', 'Bob push');

select lives_ok(
  $$insert into public.template_exercises (template_id, exercise_id, position)
    values ('bbbbbbbb-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001', 1)$$,
  'bob can add a built-in exercise to his own template'
);

select throws_ok(
  $$insert into public.template_exercises (template_id, exercise_id, position)
    values ('bbbbbbbb-0000-4000-8000-0000000000a1', 'aaaaaaaa-0000-4000-8000-000000000001', 2)$$,
  '42501',
  null,
  'bob cannot reference alice''s private exercise'
);

-- ---------------------------------------------------------------------------
-- Alice sees her own data
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.session_sets),
  1,
  'alice sees her own sets'
);

select * from finish();
rollback;
