-- Archived plans are deleted for good 30 days after they were archived (restoring resets the
-- clock). Workout history survives: sessions keep their template_name snapshot and their
-- template_id becomes null (on delete set null), like a free workout.

alter table workout_templates add column archived_at timestamptz;
-- Plans already in the archive start their 30 days now, so nothing disappears by surprise.
update workout_templates set archived_at = now() where is_archived;
alter table workout_templates add constraint workout_templates_archived_at_check
  check (is_archived = (archived_at is not null));

-- archived_at follows is_archived, so archive_template() and the restore action stay as they are.
create function public.set_template_archived_at() returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  if new.is_archived and (tg_op = 'INSERT' or not old.is_archived) then
    new.archived_at := now();
  elsif not new.is_archived then
    new.archived_at := null;
  else
    new.archived_at := old.archived_at; -- still archived: keep the original date
  end if;
  return new;
end;
$$;

create trigger workout_templates_archived_at
  before insert or update of is_archived, archived_at on workout_templates
  for each row execute function public.set_template_archived_at();

-- Deletes plans archived more than p_retention ago, across all users; returns how many.
-- Runs from pg_cron as the database owner; clients can't call it.
create function public.purge_archived_templates(p_retention interval default interval '30 days')
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_deleted integer;
begin
  with deleted as (
    delete from public.workout_templates
    where is_archived and archived_at < now() - p_retention
    returning 1
  )
  select count(*) into v_deleted from deleted;
  return v_deleted;
end;
$$;
revoke execute on function public.purge_archived_templates(interval) from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
-- Every night at 01:00 UTC (03:00–04:00 in Israel). Scheduling by name replaces an existing job.
select cron.schedule('purge-archived-plans', '0 1 * * *', 'select public.purge_archived_templates()');
