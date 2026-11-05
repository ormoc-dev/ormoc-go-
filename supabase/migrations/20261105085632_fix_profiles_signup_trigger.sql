-- Fix signup: "Database error saving new user"
-- Cause: profiles_email_format CHECK used a broken regex that could reject valid emails,
-- which made the auth.users trigger fail during signUp.

alter table public.profiles
  drop constraint if exists profiles_email_format;

-- Safer email check (optional). Allows common emails; null still allowed.
alter table public.profiles
  add constraint profiles_email_format
  check (
    email is null
    or email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  );

-- Harden profile auto-create on auth signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    nullif(
      coalesce(
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'name',
        split_part(coalesce(new.email, ''), '@', 1)
      ),
      ''
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do update
    set
      email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
      updated_at = now();

  return new;
exception
  when others then
    -- Never block auth user creation because profile insert failed
    raise warning 'handle_new_user failed: %', sqlerrm;
    return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to supabase_auth_admin;
grant execute on function public.handle_new_user() to postgres;
grant execute on function public.handle_new_user() to service_role;

grant usage on schema public to supabase_auth_admin;
grant insert, update, select on table public.profiles to supabase_auth_admin;
