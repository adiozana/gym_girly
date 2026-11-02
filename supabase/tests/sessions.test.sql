-- Session functions: start, previous performance, delete set, complete. Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;

select plan(21);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alice@users.gymtracker.local', 'authenticated', 'authenticated', '{"username":"alice"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@users.gymtracker.local', 'authenticated', 'authenticated', '{"username":"bob"}');

-- Alice's template: squat x3 sets, leg press x2 sets
insert into public.workout_templates (id, user_id, name) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', '11111111-1111-1111-1111-111111111111', 'Legs');
insert into public.template_exercises (template_id, exercise_id, position, planned_sets) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000040', 1, 3),
  ('aaaaaaaa-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000042', 2, 2);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

select throws_ok(
  $$select public.start_session('aaaaaaaa-0000-4000-8000-0000000000a1', '2026-11-01')$$,
  'P0002', null, 'bob cannot start a session from alice''s template'
);

select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

-- ---------------------------------------------------------------------------
-- Session 1: start from the template
-- ---------------------------------------------------------------------------
create temporary table s1 as
  select public.start_session('aaaaaaaa-0000-4000-8000-0000000000a1', '2026-11-01') as id;
grant select on s1 to authenticated;

select is(
  (select template_name from public.workout_sessions where id = (select id from s1)),
  'Legs', 'start snapshots the template name'
);
select results_eq(
  $$select se.exercise_id, count(ss.id)::int from public.session_exercises se
    join public.session_sets ss on ss.session_exercise_id = se.id
    where se.session_id = (select id from s1) group by se.exercise_id, se.position order by se.position$$,
  $$values ('00000000-0000-4000-8000-000000000040'::uuid, 3), ('00000000-0000-4000-8000-000000000042'::uuid, 2)$$,
  'start copies every exercise with planned_sets empty sets'
);
select throws_ok(
  $$select public.start_session(null, '2026-11-01')$$,
  '23505', null, 'a second in-progress session is rejected'
);

-- Squat: sets 1 and 3 done (60x8, 65x6), set 2 not; leg press: nothing done.
update public.session_sets ss set weight_kg = v.w, reps = v.r, is_done = v.d
from public.session_exercises se, (values (1, 60, 8, true), (2, 62.5, 7, false), (3, 65, 6, true)) as v(n, w, r, d)
where se.id = ss.session_exercise_id and se.session_id = (select id from s1)
  and se.exercise_id = '00000000-0000-4000-8000-000000000040' and ss.set_number = v.n;
update public.session_exercises set note = 'deep'
where session_id = (select id from s1) and exercise_id = '00000000-0000-4000-8000-000000000040';

select is_empty(
  $$select 1 from public.previous_performance(array['00000000-0000-4000-8000-000000000040']::uuid[])$$,
  'an in-progress session is not previous performance'
);

select ok(public.complete_session((select id from s1)), 'complete returns true when sets were done');
select is(
  (select status::text from public.workout_sessions where id = (select id from s1)),
  'completed', 'the session is completed'
);
select isnt(
  (select completed_at from public.workout_sessions where id = (select id from s1)),
  null, 'completed_at is set'
);
select results_eq(
  $$select ss.set_number, ss.weight_kg, ss.reps from public.session_sets ss
    join public.session_exercises se on se.id = ss.session_exercise_id
    where se.session_id = (select id from s1) order by ss.set_number$$,
  $$values (1, 60.00::numeric, 8), (2, 65.00::numeric, 6)$$,
  'undone sets are dropped and the rest renumbered'
);
select is(
  (select count(*)::int from public.session_exercises where session_id = (select id from s1)),
  1, 'exercises without a done set are removed'
);
select throws_ok(
  $$select public.complete_session((select id from s1))$$,
  'P0002', null, 'a completed session cannot be completed again'
);

select results_eq(
  $$select set_number, weight_kg, reps, note from public.previous_performance(
      array['00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000042']::uuid[])$$,
  $$values (1, 60.00::numeric, 8, 'deep'), (2, 65.00::numeric, 6, 'deep')$$,
  'previous performance returns the done sets and note; exercises never done return nothing'
);

-- ---------------------------------------------------------------------------
-- Session 2: free workout; swap to an alternative
-- ---------------------------------------------------------------------------
create temporary table s2 as select public.start_session(null, '2026-11-02') as id;
grant select on s2 to authenticated;

select is(
  (select count(*)::int from public.session_exercises where session_id = (select id from s2)),
  0, 'a free workout starts empty'
);

insert into public.session_exercises (id, session_id, exercise_id, replaced_exercise_id, position) values
  ('bbbbbbbb-0000-4000-8000-0000000000e1', (select id from s2), '00000000-0000-4000-8000-000000000053', '00000000-0000-4000-8000-000000000040', 1);
insert into public.session_sets (id, session_exercise_id, set_number, weight_kg, reps, is_done) values
  ('bbbbbbbb-0000-4000-8000-0000000000f1', 'bbbbbbbb-0000-4000-8000-0000000000e1', 1, 50, 10, true),
  ('bbbbbbbb-0000-4000-8000-0000000000f2', 'bbbbbbbb-0000-4000-8000-0000000000e1', 2, 50, 9, true),
  ('bbbbbbbb-0000-4000-8000-0000000000f3', 'bbbbbbbb-0000-4000-8000-0000000000e1', 3, 50, 8, true);

select public.delete_session_set('bbbbbbbb-0000-4000-8000-0000000000f2');
select results_eq(
  $$select id, set_number from public.session_sets
    where session_exercise_id = 'bbbbbbbb-0000-4000-8000-0000000000e1' order by set_number$$,
  $$values ('bbbbbbbb-0000-4000-8000-0000000000f1'::uuid, 1), ('bbbbbbbb-0000-4000-8000-0000000000f3'::uuid, 2)$$,
  'deleting a set closes the gap'
);

select ok(public.complete_session((select id from s2)), 'the free workout completes');
select is(
  (select count(*)::int from public.previous_performance(array['00000000-0000-4000-8000-000000000053']::uuid[])),
  2, 'the alternative has its own history'
);
select results_eq(
  $$select session_id from public.previous_performance(array['00000000-0000-4000-8000-000000000040']::uuid[]) limit 1$$,
  $$select id from s1$$,
  'the original exercise''s history is unaffected by the swap'
);
select is_empty(
  $$select 1 from public.previous_performance(array['00000000-0000-4000-8000-000000000053']::uuid[], (select id from s2))$$,
  'the excluded session is skipped'
);

select is_empty(
  $$select 1 from public.previous_performance(array['00000000-0000-4000-8000-000000000040']::uuid[], null,
      (select started_at from public.workout_sessions where id = (select id from s1)))$$,
  'p_before only looks at workouts that started earlier'
);

-- A session with nothing done is not saved
create temporary table s3 as select public.start_session('aaaaaaaa-0000-4000-8000-0000000000a1', '2026-11-03') as id;
grant select on s3 to authenticated;
select ok(not public.complete_session((select id from s3)), 'complete returns false when nothing was done');
select is(
  (select status::text from public.workout_sessions where id = (select id from s3)),
  'in_progress', 'and the session stays in progress'
);

select * from finish();
rollback;
