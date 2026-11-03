-- Archived plans: archived_at bookkeeping and the 30-day purge. Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', 'authenticated', 'authenticated');

insert into public.workout_templates (id, user_id, name) values
  ('aaaaaaaa-0000-4000-8000-0000000000a1', '11111111-1111-1111-1111-111111111111', 'Old'),
  ('aaaaaaaa-0000-4000-8000-0000000000a2', '11111111-1111-1111-1111-111111111111', 'Recent'),
  ('aaaaaaaa-0000-4000-8000-0000000000a3', '11111111-1111-1111-1111-111111111111', 'Active');
insert into public.template_exercises (id, template_id, exercise_id, position) values
  ('aaaaaaaa-0000-4000-8000-0000000000b1', 'aaaaaaaa-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000040', 1);
-- A finished workout of the old plan, which must survive the purge.
insert into public.workout_sessions (id, user_id, template_id, template_name, session_date, status, completed_at) values
  ('aaaaaaaa-0000-4000-8000-0000000000c1', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-4000-8000-0000000000a1', 'Old', '2026-09-01', 'completed', now());
insert into public.session_exercises (id, session_id, exercise_id, template_exercise_id, position) values
  ('aaaaaaaa-0000-4000-8000-0000000000e1', 'aaaaaaaa-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-000000000040', 'aaaaaaaa-0000-4000-8000-0000000000b1', 1);

-- archived_at follows is_archived
select is((select archived_at from public.workout_templates where id = 'aaaaaaaa-0000-4000-8000-0000000000a3'), null, 'an active plan has no archive date');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select public.archive_template('aaaaaaaa-0000-4000-8000-0000000000a1');
select public.archive_template('aaaaaaaa-0000-4000-8000-0000000000a2');
select isnt((select archived_at from public.workout_templates where id = 'aaaaaaaa-0000-4000-8000-0000000000a1'), null, 'archiving sets the archive date');
select throws_ok($$select public.purge_archived_templates()$$, '42501', null, 'users cannot run the purge');
reset role;

-- Backdate: the old plan was archived 31 days ago, the recent one 29 days ago.
alter table public.workout_templates disable trigger workout_templates_archived_at;
update public.workout_templates set archived_at = now() - interval '31 days' where id = 'aaaaaaaa-0000-4000-8000-0000000000a1';
update public.workout_templates set archived_at = now() - interval '29 days' where id = 'aaaaaaaa-0000-4000-8000-0000000000a2';
alter table public.workout_templates enable trigger workout_templates_archived_at;

-- Renaming an archived plan keeps its date; restoring clears it; archiving again restarts it.
update public.workout_templates set name = 'Recent!' where id = 'aaaaaaaa-0000-4000-8000-0000000000a2';
select ok((select archived_at < now() - interval '28 days' from public.workout_templates where id = 'aaaaaaaa-0000-4000-8000-0000000000a2'), 'editing an archived plan keeps its archive date');

select is(public.purge_archived_templates(), 1, 'the purge deletes only plans archived over 30 days ago');
select ok(not exists (select 1 from public.workout_templates where id = 'aaaaaaaa-0000-4000-8000-0000000000a1'), 'the old plan is gone');
select ok(exists (select 1 from public.workout_templates where id = 'aaaaaaaa-0000-4000-8000-0000000000a2'), 'a recently archived plan stays');
select ok(exists (select 1 from public.workout_templates where id = 'aaaaaaaa-0000-4000-8000-0000000000a3'), 'an active plan stays');
select results_eq(
  $$select template_id, template_name from public.workout_sessions where id = 'aaaaaaaa-0000-4000-8000-0000000000c1'$$,
  $$values (null::uuid, 'Old'::text)$$,
  'the workout stays in history with the plan name'
);
select is((select count(*)::int from public.session_exercises where session_id = 'aaaaaaaa-0000-4000-8000-0000000000c1'), 1, 'its exercises stay too');

update public.workout_templates set is_archived = false where id = 'aaaaaaaa-0000-4000-8000-0000000000a2';
select is((select archived_at from public.workout_templates where id = 'aaaaaaaa-0000-4000-8000-0000000000a2'), null, 'restoring clears the archive date');

select is((select schedule from cron.job where jobname = 'purge-archived-plans'), '0 1 * * *', 'the purge runs nightly');

select * from finish();
rollback;
