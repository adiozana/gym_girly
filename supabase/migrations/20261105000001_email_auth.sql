-- Sign-in moves to email + password (and Google). Usernames stay only for accounts made before
-- this change; a display name is set on the welcome screen after the first sign-in.
alter table profiles alter column username drop not null;
alter table profiles add column display_name text
  check (display_name is null or char_length(btrim(display_name)) between 1 and 40);

-- The profile row is still created with the user; the name comes later (welcome screen).
-- A username in the metadata (accounts from before email sign-in) is kept as it was.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end;
$$;
