-- Apply after 006. Room numbers remain stable appointment identifiers.
begin;
alter table public.facility_settings add column room_aliases jsonb not null default '{}'::jsonb;
alter function public.mutate_cred(text,jsonb) rename to manage_cred_v6;
alter function public.manage_cred_v6(text,jsonb) set schema private;
revoke all on function private.manage_cred_v6(text,jsonb) from public,anon,authenticated;
create function public.mutate_cred(action text,p jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not private.is_active_staff() then raise exception 'CRED: Acceso no autorizado.' using errcode='42501'; end if;
  if action='save_room_aliases' then
    perform pg_advisory_xact_lock(5222);
    if not exists(select 1 from public.staff_profiles where id=auth.uid() and active and role in ('admin','manager')) then
      raise exception 'CRED: Solo administración o el responsable pueden configurar consultorios.' using errcode='42501';
    end if;
    if jsonb_typeof(p->'room_aliases') is distinct from 'object' then raise exception 'CRED: Alias de consultorios no válidos.'; end if;
    if exists(select 1 from jsonb_each(p->'room_aliases') as a where a.key !~ '^([1-9]|1[0-9]|20)$' or jsonb_typeof(a.value)<>'string' or length(a.value #>> '{}')>40) then
      raise exception 'CRED: Usa alias de hasta 40 caracteres para consultorios del 1 al 20.';
    end if;
    update public.facility_settings set room_aliases=p->'room_aliases' where id=1 and revision=(p->>'revision')::bigint;
    if not found then raise exception 'CRED: La configuración cambió. Actualiza.' using errcode='40001'; end if;
    return jsonb_build_object('id',1);
  end if;
  return private.manage_cred_v6(action,p);
end;
$$;
revoke all on function public.mutate_cred(text,jsonb) from public,anon;
grant execute on function public.mutate_cred(text,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
