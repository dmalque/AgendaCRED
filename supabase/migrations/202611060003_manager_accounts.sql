-- Apply once AFTER migrations 001 and 002. Existing administrators are preserved.
begin;

alter table public.staff_profiles drop constraint staff_profiles_role_check;
alter table public.staff_profiles add constraint staff_profiles_role_check
  check (role in ('nurse', 'manager', 'admin'));

create or replace function private.is_active_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.staff_profiles
    where id=auth.uid() and active and role in ('nurse','manager','admin'));
$$;

-- Retain the clinical implementation, but make it unreachable to API callers.
alter function public.mutate_cred(text,jsonb) set schema private;
revoke all on function private.mutate_cred(text,jsonb) from public, anon, authenticated;

create function public.mutate_cred(action text, p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  caller_role text;
  target public.staff_profiles;
  rid uuid;
begin
  if not private.is_active_staff() then
    raise exception 'CRED: Acceso no autorizado.' using errcode='42501';
  end if;
  if p is null or jsonb_typeof(p)<>'object' then
    raise exception 'CRED: Datos no válidos.';
  end if;

  if action in ('save_staff','save_operational_settings','closed_day','save_settings') then
    -- Serialize authorization and profile changes; a revoked manager cannot finish
    -- a new profile through an already-open session.
    perform pg_advisory_xact_lock(5222);
    select role into caller_role from public.staff_profiles where id=uid and active;
    if caller_role is null or caller_role not in ('admin','manager') then
      raise exception 'CRED: Solo administración o el responsable pueden gestionar el consultorio.' using errcode='42501';
    end if;

    if action='save_staff' then
      if coalesce(p->>'role','') not in ('nurse','manager','admin') or
         jsonb_typeof(p->'active') is distinct from 'boolean' then
        raise exception 'CRED: Revisa el rol y el estado de acceso.';
      end if;
      select * into target from public.staff_profiles where id=(p->>'id')::uuid for update;
      if caller_role='manager' and
        (p->>'role'<>'nurse' or (target.id is not null and target.role<>'nurse')) then
        raise exception 'CRED: El responsable solo puede gestionar perfiles de enfermería.' using errcode='42501';
      end if;
      if target.role='admin' and target.active and
        (p->>'role'<>'admin' or not (p->>'active')::boolean) and
        (select count(*) from public.staff_profiles where active and role='admin')<=1 then
        raise exception 'CRED: Debe quedar al menos un administrador activo.';
      end if;
      insert into public.staff_profiles(id,full_name,role,active)
        values((p->>'id')::uuid,trim(p->>'full_name'),p->>'role',(p->>'active')::boolean)
        on conflict(id) do update set full_name=excluded.full_name,role=excluded.role,active=excluded.active
        returning id into rid;
      return jsonb_build_object('id',rid);
    elsif action='save_operational_settings' then
      -- An allowlist prevents hidden normative or identity changes in a crafted request.
      if exists(select 1 from jsonb_object_keys(p) as k(key)
        where key not in ('revision','opens_at','closes_at','slot_minutes','room_count','working_days')) then
        raise exception 'CRED: Solo puedes modificar horarios, días y capacidad.' using errcode='42501';
      end if;
      update public.facility_settings set
        opens_at=(p->>'opens_at')::time, closes_at=(p->>'closes_at')::time,
        slot_minutes=(p->>'slot_minutes')::integer, room_count=(p->>'room_count')::integer,
        working_days=array(select jsonb_array_elements_text(p->'working_days')::integer)
        where id=1 and revision=(p->>'revision')::bigint;
      if not found then raise exception 'CRED: La configuración cambió. Actualiza.' using errcode='40001'; end if;
      return jsonb_build_object('id',1);
    elsif action='closed_day' then
      if coalesce((p->>'reopen')::boolean,false) then
        delete from public.closed_days where date=(p->>'date')::date;
        insert into public.audit_events(entity,entity_id,action,actor_id)
          values('closed_days',p->>'date','REOPEN',uid);
      else
        if exists(select 1 from public.appointments
          where (starts_at at time zone 'America/Lima')::date=(p->>'date')::date
          and status in ('scheduled','arrived','in_progress')) then
          raise exception 'CRED: Reprograma primero los controles de ese día.';
        end if;
        insert into public.closed_days(date,reason) values((p->>'date')::date,p->>'reason')
          on conflict(date) do update set reason=excluded.reason;
      end if;
      return jsonb_build_object('date',p->>'date');
    elsif caller_role<>'admin' then
      raise exception 'CRED: Solo administración puede configurar el establecimiento y las reglas CRED.' using errcode='42501';
    end if;
  end if;
  return private.mutate_cred(action,p);
end;
$$;
revoke all on function public.mutate_cred(text,jsonb) from public, anon;
grant execute on function public.mutate_cred(text,jsonb) to authenticated;
-- Explicitly allow the server to check the caller even when automatic table grants
-- were disabled. Account/profile creation still uses the caller's checked RPC.
grant select on public.staff_profiles to service_role;
notify pgrst, 'reload schema';
commit;
