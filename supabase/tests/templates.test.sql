-- Template functions: duplicate, reorder, archive, exercise usage. Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

-- Fixtures (as superuser): alice has a 2-exercise template with alternatives and a goal day.
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alice@users.gymtracker.local', 'authenticated', 'authenticated', '{"username":"alice"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@users.gymtracker.local', 'authenticated', 'authenticated', '{"username":"bob"}');

insert into public.workout_templates (id, user_id, name) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', '11111111-1111-1111-1111-111111111111', 'Legs');

insert into public.template_exercises (id, template_id, exercise_id, position, planned_sets, rep_range_min, rep_range_max, note) values
  ('aaaaaaaa-0000-4000-8000-0000000000b1', 'aaaaaaaa-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000040', 1, 4, 6, 8, 'deep'),
  ('aaaaaaaa-0000-4000-8000-0000000000b2', 'aaaaaaaa-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000044', 2, 3, null, null, null);

insert into public.template_exercise_alternatives (id, template_exercise_id, exercise_id, position) values
  ('aaaaaaaa-0000-4000-8000-0000000000c1', 'aaaaaaaa-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-000000000042', 1),
  ('aaaaaaaa-0000-4000-8000-0000000000c2', 'aaaaaaaa-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-000000000043', 2);

insert into public.goals (id, user_id, type, training_weekdays, start_date) values
  ('aaaaaaaa-0000-4000-8000-0000000000d1', '11111111-1111-1111-1111-111111111111', 'fixed_days', '{0,2,4}', '2026-10-01');
insert into public.goal_day_templates (goal_id, weekday, template_id) values
  ('aaaaaaaa-0000-4000-8000-0000000000d1', 0, 'aaaaaaaa-0000-4000-8000-0000000000a1');

-- Rep range constraint
select throws_ok(
  $$update public.template_exercises set rep_range_min = 12, rep_range_max = 8
    where id = 'aaaaaaaa-0000-4000-8000-0000000000b1'$$,
  '23514', null, 'rep range min cannot exceed max'
);
select throws_ok(
  $$update public.template_exercises set rep_range_min = 0 where id = 'aaaaaaaa-0000-4000-8000-0000000000b1'$$,
  '23514', null, 'rep range values start at 1'
);

-- ---------------------------------------------------------------------------
-- Bob cannot use the functions on alice's template
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

select throws_ok(
  $$select public.duplicate_template('aaaaaaaa-0000-4000-8000-0000000000a1', 'stolen')$$,
  'P0002', null, 'bob cannot duplicate alice''s template'
);
select throws_ok(
  $$select public.reorder_template_exercises('aaaaaaaa-0000-4000-8000-0000000000a1',
      array['aaaaaaaa-0000-4000-8000-0000000000b2','aaaaaaaa-0000-4000-8000-0000000000b1']::uuid[])$$,
  '22023', null, 'bob cannot reorder alice''s template'
);
select throws_ok(
  $$select public.archive_template('aaaaaaaa-0000-4000-8000-0000000000a1')$$,
  'P0002', null, 'bob cannot archive alice''s template'
);

-- ---------------------------------------------------------------------------
-- Alice
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

-- duplicate
create temporary table copy as
  select public.duplicate_template('aaaaaaaa-0000-4000-8000-0000000000a1', 'Legs (copy)') as id;

select is(
  (select name from public.workout_templates where id = (select id from copy)),
  'Legs (copy)', 'duplicate creates a template with the given name'
);
select results_eq(
  $$select exercise_id, position, planned_sets, rep_range_min, rep_range_max, note
    from public.template_exercises where template_id = (select id from copy) order by position$$,
  $$select exercise_id, position, planned_sets, rep_range_min, rep_range_max, note
    from public.template_exercises where template_id = 'aaaaaaaa-0000-4000-8000-0000000000a1' order by position$$,
  'duplicate copies every exercise with its settings'
);
select results_eq(
  $$select a.exercise_id, a.position from public.template_exercise_alternatives a
    join public.template_exercises te on te.id = a.template_exercise_id
    where te.template_id = (select id from copy) order by a.position$$,
  $$values ('00000000-0000-4000-8000-000000000042'::uuid, 1), ('00000000-0000-4000-8000-000000000043'::uuid, 2)$$,
  'duplicate copies the alternatives in order'
);
select is(
  (select count(*)::int from public.template_exercises where template_id = 'aaaaaaaa-0000-4000-8000-0000000000a1'),
  2, 'the original template is unchanged'
);

-- reorder exercises
select lives_ok(
  $$select public.reorder_template_exercises('aaaaaaaa-0000-4000-8000-0000000000a1',
      array['aaaaaaaa-0000-4000-8000-0000000000b2','aaaaaaaa-0000-4000-8000-0000000000b1']::uuid[])$$,
  'alice can reorder her template'
);
select results_eq(
  $$select id from public.template_exercises
    where template_id = 'aaaaaaaa-0000-4000-8000-0000000000a1' order by position$$,
  $$values ('aaaaaaaa-0000-4000-8000-0000000000b2'::uuid), ('aaaaaaaa-0000-4000-8000-0000000000b1'::uuid)$$,
  'reorder sets the new order'
);
select throws_ok(
  $$select public.reorder_template_exercises('aaaaaaaa-0000-4000-8000-0000000000a1',
      array['aaaaaaaa-0000-4000-8000-0000000000b1']::uuid[])$$,
  '22023', null, 'reorder rejects a partial list'
);

-- reorder alternatives
select public.reorder_template_alternatives('aaaaaaaa-0000-4000-8000-0000000000b1',
  array['aaaaaaaa-0000-4000-8000-0000000000c2','aaaaaaaa-0000-4000-8000-0000000000c1']::uuid[]);
select results_eq(
  $$select id from public.template_exercise_alternatives
    where template_exercise_id = 'aaaaaaaa-0000-4000-8000-0000000000b1' order by position$$,
  $$values ('aaaaaaaa-0000-4000-8000-0000000000c2'::uuid), ('aaaaaaaa-0000-4000-8000-0000000000c1'::uuid)$$,
  'reorder alternatives sets the new priority'
);

-- exercise usage
select ok(public.exercise_in_use('00000000-0000-4000-8000-000000000042'), 'an alternative counts as in use');
select ok(not public.exercise_in_use('00000000-0000-4000-8000-000000000001'), 'an unused exercise is not in use');

-- archive
select is(
  public.archive_template('aaaaaaaa-0000-4000-8000-0000000000a1'),
  1, 'archive reports the removed weekday assignment'
);
select is(
  (select is_archived from public.workout_templates where id = 'aaaaaaaa-0000-4000-8000-0000000000a1'),
  true, 'archive marks the template archived'
);

select * from finish();
rollback;
