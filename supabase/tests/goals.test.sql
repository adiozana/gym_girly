-- Goal and challenge functions. Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alice@users.gymtracker.local', 'authenticated', 'authenticated', '{"username":"alice"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@users.gymtracker.local', 'authenticated', 'authenticated', '{"username":"bob"}');
insert into public.workout_templates (id, user_id, name) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', '11111111-1111-1111-1111-111111111111', 'Legs'),
  ('bbbbbbbb-0000-4000-8000-0000000000a1', '22222222-2222-2222-2222-222222222222', 'Bob');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select throws_ok(
  $$select public.start_challenge(4, '2026-10-01')$$,
  'P0002', null, 'a challenge needs an active goal'
);
select throws_ok(
  $$select public.set_goal('fixed_days', '{}', null, null, null, '2026-10-01')$$,
  '22023', null, 'fixed_days needs at least one weekday'
);

-- First goal: Sun/Tue/Thu with a template on Sunday (Monday's template is ignored: rest day)
select public.set_goal('fixed_days', '{4,0,2,2}', null, null,
  '{"0":"aaaaaaaa-0000-4000-8000-0000000000a1","1":"aaaaaaaa-0000-4000-8000-0000000000a1"}', '2026-10-01');
select results_eq(
  $$select training_weekdays, start_date, end_date from public.goals$$,
  $$values ('{0,2,4}'::int[], '2026-10-01'::date, null::date)$$,
  'the goal stores sorted, distinct weekdays and starts today'
);
select results_eq(
  $$select weekday from public.goal_day_templates$$,
  $$values (0)$$,
  'templates are kept only for training weekdays'
);

-- Replace on the same day: the earlier goal is dropped, not ended before it began
select public.set_goal('fixed_days', '{1,3}', null, null, null, '2026-10-01');
select is((select count(*)::int from public.goals), 1, 'a goal replaced on its first day is removed');

-- Replace later with a cycle
select public.set_goal('cycle', null, 2, 1, null, '2026-10-10');
select results_eq(
  $$select type::text, start_date, end_date from public.goals order by start_date$$,
  $$values ('fixed_days', '2026-10-01'::date, '2026-10-09'::date), ('cycle', '2026-10-10'::date, null::date)$$,
  'the previous goal ends yesterday and the new one starts today'
);
select results_eq(
  $$select cycle_on, cycle_off, training_weekdays from public.goals where end_date is null$$,
  $$values (2, 1, null::int[])$$,
  'a cycle goal stores on/off days only'
);

-- Challenges
select lives_ok($$select public.start_challenge(4, '2026-10-10')$$, 'a challenge starts with an active goal');
select throws_ok(
  $$select public.start_challenge(2, '2026-10-10')$$,
  '23505', null, 'only one active challenge at a time'
);

-- Day templates may only reference own templates
select throws_ok(
  $$select public.set_goal('fixed_days', '{0}', null, null, '{"0":"bbbbbbbb-0000-4000-8000-0000000000a1"}', '2026-10-20')$$,
  '42501', null, 'a goal day cannot use another user''s template'
);

-- Bob sees none of it
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select is_empty('select 1 from public.goals', 'bob cannot see alice''s goals');
select is_empty('select 1 from public.challenges', 'bob cannot see alice''s challenges');

select * from finish();
rollback;
