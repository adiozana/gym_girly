-- Create the profile row as part of sign-up, so a user can never exist without one.
-- The username is passed as user metadata by the sign-up Server Action; an invalid or
-- missing username fails the profiles check constraint and aborts the sign-up.
create function public.handle_new_user()
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

-- Only the trigger calls this function.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
