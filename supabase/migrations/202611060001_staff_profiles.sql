-- Run once in the Supabase SQL editor or via supabase db push.
begin;

create table public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  role text not null check (role in ('nurse', 'admin')),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.staff_profiles enable row level security;
revoke all on public.staff_profiles from anon, authenticated;
grant select on public.staff_profiles to authenticated;

-- Users can see their own status, but cannot grant themselves a role or reactivate themselves.
create policy "staff_read_own_profile" on public.staff_profiles
for select to authenticated using ((select auth.uid()) = id);

create function public.touch_staff_profile_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger staff_profile_updated_at before update on public.staff_profiles
for each row execute function public.touch_staff_profile_updated_at();

-- Future clinical/agenda tables must use this database check in EVERY RLS policy.
-- Frontend route protection is for UX; RLS is the actual data access boundary.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create function private.is_active_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_profiles
    where id = (select auth.uid()) and active = true and role in ('nurse', 'admin')
  );
$$;
revoke all on function private.is_active_staff() from public;
grant execute on function private.is_active_staff() to authenticated;

comment on table public.staff_profiles is 'Authorized staff only. Managed through privileged administration, never by the public client.';
commit;
