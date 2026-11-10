-- Follow-up assignees must be active nurses. Apply after 005.
begin;
alter function public.mutate_cred(text,jsonb) rename to manage_cred_v5;
alter function public.manage_cred_v5(text,jsonb) set schema private;
revoke all on function private.manage_cred_v5(text,jsonb) from public,anon,authenticated;
create function public.mutate_cred(action text,p jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not private.is_active_staff() then
    raise exception 'CRED: Acceso no autorizado.' using errcode='42501';
  end if;
  if action='create_followup' then
    -- Serialize assignment checks with staff role and activation changes.
    perform pg_advisory_xact_lock(5222);
    if not exists(select 1 from public.staff_profiles where id=(p->>'assigned_to')::uuid and active and role='nurse') then
      raise exception 'CRED: Selecciona una enfermera activa como responsable.';
    end if;
  end if;
  return private.manage_cred_v5(action,p);
end;
$$;
revoke all on function public.mutate_cred(text,jsonb) from public,anon;
grant execute on function public.mutate_cred(text,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
