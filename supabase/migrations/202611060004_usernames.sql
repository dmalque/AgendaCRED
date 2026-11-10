-- Apply once after 003. Preserves existing Auth identities and passwords.
begin;
alter table public.staff_profiles add column username text;
with ranked as (
  select id, role, row_number() over(partition by role order by created_at,id) as n
  from public.staff_profiles
)
update public.staff_profiles s set username = case
  when r.role='admin' then 'admin' || case when n=1 then '' else n::text end
  when r.role='manager' then 'responsable' || case when n=1 then '' else n::text end
  else 'enf' || n::text end
from ranked r where r.id=s.id;
alter table public.staff_profiles alter column username set not null;
alter table public.staff_profiles alter column username set default ('u_'||substr(replace(gen_random_uuid()::text,'-',''),1,20));
alter table public.staff_profiles add constraint staff_username_format check(username ~ '^[a-z][a-z0-9._-]{2,23}$');
alter table public.staff_profiles add constraint staff_username_unique unique(username);

-- Chain the existing checked dispatcher; clients cannot bypass either layer.
alter function public.mutate_cred(text,jsonb) rename to manage_cred_v3;
alter function public.manage_cred_v3(text,jsonb) set schema private;
revoke all on function private.manage_cred_v3(text,jsonb) from public, anon, authenticated;
create function public.mutate_cred(action text,p jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; target public.staff_profiles; caller_role text;
begin
  if not private.is_active_staff() then
    raise exception 'CRED: Acceso no autorizado.' using errcode='42501';
  end if;
  if action='authorize_password_reset' then
    perform pg_advisory_xact_lock(5222);
    select role into caller_role from public.staff_profiles where id=auth.uid() and active;
    select * into target from public.staff_profiles where id=(p->>'id')::uuid for update;
    if caller_role is null or caller_role not in ('admin','manager') or target.id is null or target.id=auth.uid()
      or (caller_role='manager' and target.role<>'nurse') then
      raise exception 'CRED: No tienes permiso para restablecer esta cuenta. Para tu propia clave usa Cambiar mi contraseña.' using errcode='42501';
    end if;
    -- A request audit is accurate even if the following Auth operation fails.
    insert into public.audit_events(entity,entity_id,action,actor_id)
      values('staff_profiles',target.id::text,'PASSWORD_RESET_REQUEST',auth.uid());
    return jsonb_build_object('id',target.id);
  end if;
  result:=private.manage_cred_v3(action,p);
  if action='save_staff' and p ? 'username' then
    -- The inner dispatcher has already authorized the caller and locked staff.
    update public.staff_profiles set username=lower(trim(p->>'username')) where id=(result->>'id')::uuid;
  end if;
  return result;
end;
$$;
revoke all on function public.mutate_cred(text,jsonb) from public,anon;
grant execute on function public.mutate_cred(text,jsonb) to authenticated;

-- No anonymous username/email lookup. The Edge login endpoint is the only caller.
create table private.staff_login_limits (
  bucket text primary key,
  window_started timestamptz not null,
  attempts integer not null
);
revoke all on private.staff_login_limits from public,anon,authenticated;
create function public.take_staff_login_attempt(login_username text)
returns boolean language plpgsql security definer set search_path='' as $$
declare attempted_at timestamptz:=clock_timestamp(); global_count integer; user_count integer;
begin
  if login_username is null or login_username !~ '^[a-z][a-z0-9._-]{2,23}$' then return false; end if;
  -- Lock both buckets in a consistent order; limits survive Edge cold starts.
  delete from private.staff_login_limits where window_started<attempted_at-interval '1 hour';
  insert into private.staff_login_limits(bucket,window_started,attempts) values('*',attempted_at,1)
    on conflict(bucket) do update set
      attempts=case when staff_login_limits.window_started<attempted_at-interval '5 minutes' then 1 else staff_login_limits.attempts+1 end,
      window_started=case when staff_login_limits.window_started<attempted_at-interval '5 minutes' then attempted_at else staff_login_limits.window_started end
    returning attempts into global_count;
  if global_count>60 then return false; end if;
  insert into private.staff_login_limits(bucket,window_started,attempts) values(md5(login_username),attempted_at,1)
    on conflict(bucket) do update set
      attempts=case when staff_login_limits.window_started<attempted_at-interval '5 minutes' then 1 else staff_login_limits.attempts+1 end,
      window_started=case when staff_login_limits.window_started<attempted_at-interval '5 minutes' then attempted_at else staff_login_limits.window_started end
    returning attempts into user_count;
  return user_count<=10;
end;
$$;
revoke all on function public.take_staff_login_attempt(text) from public,anon,authenticated;
grant execute on function public.take_staff_login_attempt(text) to service_role;
notify pgrst, 'reload schema';
commit;
