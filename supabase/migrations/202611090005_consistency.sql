-- Apply after 004. Preserve the existing dispatcher and its authorization checks.
begin;
alter function public.mutate_cred(text,jsonb) rename to manage_cred_v4;
alter function public.manage_cred_v4(text,jsonb) set schema private;
revoke all on function private.manage_cred_v4(text,jsonb) from public,anon,authenticated;

create function public.mutate_cred(action text,p jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not private.is_active_staff() then
    raise exception 'CRED: Acceso no autorizado.' using errcode='42501';
  end if;
  if p is null or jsonb_typeof(p)<>'object' then
    raise exception 'CRED: Datos no válidos.';
  end if;
  if action in ('appointment_status','contact','resolve_followup') then
    if jsonb_typeof(p->'revision') is distinct from 'number'
      or coalesce(p->>'revision','') !~ '^[0-9]+$' then
      raise exception 'CRED: Falta la versión del registro. Actualiza la pantalla.' using errcode='40001';
    end if;
    if (p->>'revision')::numeric<1 then
      raise exception 'CRED: Versión del registro no válida.' using errcode='40001';
    end if;
  end if;
  -- Shared transaction lock serializes reservations and closures for this small facility.
  -- It is taken before the inner dispatcher's locks, so both operations see committed changes.
  if action in ('book','reschedule','closed_day') then
    perform pg_advisory_xact_lock(5223);
  end if;
  return private.manage_cred_v4(action,p);
end;
$$;
revoke all on function public.mutate_cred(text,jsonb) from public,anon;
grant execute on function public.mutate_cred(text,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
