-- Library alternatives, plan weight auto-update and per-exercise set saving. Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;

select plan(15);

-- ---------------------------------------------------------------------------
-- Seed: every built-in exercise has exactly 2 alternatives, never itself
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from public.exercises e where e.user_id is null
     and (select count(*) from public.exercise_alternatives a where a.exercise_id = e.id) <> 2),
  0, 'every built-in exercise has exactly 2 alternatives'
);
select is(
  (select count(*)::int from public.exercise_alternatives a
   join public.exercises e on e.id = a.alternative_exercise_id where e.user_id is not null),
  0, 'built-in alternatives point at built-in exercises'
);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alice@users.gymtracker.local', 'authenticated', 'authenticated', '{"username":"alice"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@users.gymtracker.local', 'authenticated', 'authenticated', '{"username":"bob"}');
insert into public.exercises (id, user_id, name_he, muscle_group, equipment) values
  ('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'שלי', 'legs', 'other'),
  ('bbbbbbbb-0000-4000-8000-000000000001', '22222222-2222-2222-2222-222222222222', 'של בוב', 'legs', 'other');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

-- ---------------------------------------------------------------------------
-- Personal alternatives
-- ---------------------------------------------------------------------------
select lives_ok(
  $$select public.set_exercise_alternatives('aaaaaaaa-0000-4000-8000-000000000001',
      array['00000000-0000-4000-8000-000000000042','00000000-0000-4000-8000-000000000043']::uuid[])$$,
  'alice sets 2 alternatives for her exercise'
);
select results_eq(
  $$select alternative_exercise_id, position from public.exercise_alternatives
    where exercise_id = 'aaaaaaaa-0000-4000-8000-000000000001' order by position$$,
  $$values ('00000000-0000-4000-8000-000000000042'::uuid, 1), ('00000000-0000-4000-8000-000000000043'::uuid, 2)$$,
  'they are stored in order'
);
select throws_ok(
  $$select public.set_exercise_alternatives('aaaaaaaa-0000-4000-8000-000000000001',
      array['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003']::uuid[])$$,
  '22023', null, 'at most 2 alternatives'
);
select throws_ok(
  $$select public.set_exercise_alternatives('00000000-0000-4000-8000-000000000040', array['00000000-0000-4000-8000-000000000042']::uuid[])$$,
  'P0002', null, 'built-in alternatives cannot be changed'
);
select throws_ok(
  $$select public.set_exercise_alternatives('aaaaaaaa-0000-4000-8000-000000000001', array['bbbbbbbb-0000-4000-8000-000000000001']::uuid[])$$,
  '42501', null, 'another user''s exercise cannot be an alternative'
);
select is(
  (select count(*)::int from public.exercise_alternatives where exercise_id = '00000000-0000-4000-8000-000000000040'),
  2, 'users read built-in alternatives'
);

-- ---------------------------------------------------------------------------
-- One call saves all sets of an exercise; saving the workout updates the plan weight
-- ---------------------------------------------------------------------------
insert into public.workout_templates (id, user_id, name) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', '11111111-1111-1111-1111-111111111111', 'Legs');
insert into public.template_exercises (id, template_id, exercise_id, position, planned_sets, target_weight_kg) values
  ('aaaaaaaa-0000-4000-8000-0000000000b1', 'aaaaaaaa-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000040', 1, 3, 50),
  ('aaaaaaaa-0000-4000-8000-0000000000b2', 'aaaaaaaa-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000042', 2, 3, 100);

create temporary table s as select public.start_session('aaaaaaaa-0000-4000-8000-0000000000a1', '2026-11-02') as id;
grant select on s to authenticated;
create temporary table cards as
  select id, exercise_id from public.session_exercises where session_id = (select id from s);
grant select on cards to authenticated;

-- Squat: 3 done sets of 60 x 8 in one call (new client ids replace the empty ones)
select lives_ok(
  $$select public.save_session_exercise_sets(
      (select id from cards where exercise_id = '00000000-0000-4000-8000-000000000040'),
      array['cccccccc-0000-4000-8000-000000000001','cccccccc-0000-4000-8000-000000000002','cccccccc-0000-4000-8000-000000000003']::uuid[],
      60, 8, true)$$,
  'one call saves all sets of an exercise'
);
select results_eq(
  $$select set_number, weight_kg, reps, is_done from public.session_sets
    where session_exercise_id = (select id from cards where exercise_id = '00000000-0000-4000-8000-000000000040')
    order by set_number$$,
  $$values (1, 60.00::numeric, 8, true), (2, 60.00::numeric, 8, true), (3, 60.00::numeric, 8, true)$$,
  'the sets are uniform and numbered 1..n'
);
select throws_ok(
  $$select public.save_session_exercise_sets(
      (select id from cards where exercise_id = '00000000-0000-4000-8000-000000000040'),
      array['cccccccc-0000-4000-8000-000000000001']::uuid[], 60, 0, true)$$,
  '22023', null, 'done with 0 reps is rejected'
);

-- Leg press is swapped to hack squat and done at 120
update public.session_exercises set exercise_id = '00000000-0000-4000-8000-000000000043',
  replaced_exercise_id = '00000000-0000-4000-8000-000000000042'
where id = (select id from cards where exercise_id = '00000000-0000-4000-8000-000000000042');
select public.save_session_exercise_sets(
  (select id from cards where exercise_id = '00000000-0000-4000-8000-000000000042'),
  array['cccccccc-0000-4000-8000-000000000011','cccccccc-0000-4000-8000-000000000012']::uuid[], 120, 10, true);

select ok(public.complete_session((select id from s)), 'the workout is saved');
select is(
  (select target_weight_kg from public.template_exercises where id = 'aaaaaaaa-0000-4000-8000-0000000000b1'),
  60.00::numeric, 'the plan weight updates to what was lifted'
);
select is(
  (select target_weight_kg from public.template_exercises where id = 'aaaaaaaa-0000-4000-8000-0000000000b2'),
  100.00::numeric, 'a swapped exercise leaves the plan weight unchanged'
);

-- Bob cannot write into alice's workout
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select throws_ok(
  $$select public.save_session_exercise_sets(
      (select id from cards where exercise_id = '00000000-0000-4000-8000-000000000040'),
      array['cccccccc-0000-4000-8000-000000000099']::uuid[], 1, 1, true)$$,
  'P0002', null, 'bob cannot save sets into alice''s workout'
);

select * from finish();
rollback;
