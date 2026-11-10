begin;
create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
set local search_path = public, extensions;

create function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.staff_profiles where id=auth.uid() and active and role='admin');
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;
create policy staff_team_directory on public.staff_profiles for select to authenticated using (private.is_active_staff());

create table public.facility_settings (
  id integer primary key check(id=1), display_name text not null default 'CSMI El Milagro' check(length(trim(display_name)) between 3 and 120),
  ipress_code text not null default '00005222' check(ipress_code='00005222'),
  opens_at time not null default '08:00', closes_at time not null default '13:00',
  slot_minutes integer not null default 30 check(slot_minutes between 15 and 120),
  room_count integer not null default 2 check(room_count between 1 and 20),
  working_days integer[] not null default '{1,2,3,4,5}' check(cardinality(working_days)>0 and working_days <@ array[0,1,2,3,4,5,6]),
  rule_version text not null default 'NTS 238 / 2025' check(length(trim(rule_version)) between 3 and 120),
  rule_source text not null default 'https://www.gob.pe/institucion/minsa/informes-publicaciones/7857089',
  rules_approved boolean not null default false, approved_by uuid references public.staff_profiles(id), approved_at timestamptz,
  revision bigint not null default 1, updated_at timestamptz not null default now(), check(closes_at>opens_at)
);
insert into public.facility_settings(id) values(1);
create table public.closed_days(date date primary key, reason text not null check(length(trim(reason)) between 3 and 300));

create table public.children (
 id uuid primary key default gen_random_uuid(), full_name text not null check(length(trim(full_name)) between 3 and 150),
 document_type text not null check(document_type in ('DNI','CNV','CE','PROVISIONAL')), document_number text not null check(length(trim(document_number)) between 1 and 30),
 birth_date date not null, sex text not null check(sex in ('F','M','NR')), history_number text not null default '' check(length(history_number)<=40),
 guardian_name text not null check(length(trim(guardian_name)) between 3 and 150), guardian_relationship text not null check(length(trim(guardian_relationship)) between 2 and 60),
 phone text not null check(length(trim(phone)) between 6 and 30), address text not null check(length(trim(address)) between 3 and 300),
 notes text not null default '' check(length(notes)<=2000), archived boolean not null default false,
 created_by uuid not null references public.staff_profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), revision bigint not null default 1,
 check(document_type<>'DNI' or document_number ~ '^\d{8}$')
);
create unique index children_document_unique on public.children(upper(document_number));
create index children_name_idx on public.children(full_name);

create table public.appointments (
 id uuid primary key default gen_random_uuid(), child_id uuid not null references public.children(id), nurse_id uuid not null references public.staff_profiles(id),
 starts_at timestamptz not null, ends_at timestamptz not null, room integer not null check(room>0),
 status text not null default 'scheduled' check(status in ('scheduled','arrived','in_progress','completed','no_show','cancelled','rescheduled')),
 reason text not null default '' check(length(reason)<=1000), previous_id uuid unique references public.appointments(id),
 created_by uuid not null references public.staff_profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), revision bigint not null default 1,
 check(ends_at>starts_at and ends_at<=starts_at+interval '120 minutes'),
 exclude using gist(nurse_id with =, tstzrange(starts_at,ends_at,'[)') with &&) where(status in ('scheduled','arrived','in_progress','completed')),
 exclude using gist(room with =, tstzrange(starts_at,ends_at,'[)') with &&) where(status in ('scheduled','arrived','in_progress','completed')),
 exclude using gist(child_id with =, tstzrange(starts_at,ends_at,'[)') with &&) where(status in ('scheduled','arrived','in_progress','completed'))
);
create index appointments_date_idx on public.appointments(starts_at);
create index appointments_child_idx on public.appointments(child_id,starts_at desc);

create table public.encounters (
 id uuid primary key default gen_random_uuid(), appointment_id uuid not null unique references public.appointments(id), child_id uuid not null references public.children(id),
 nurse_id uuid not null references public.staff_profiles(id), performed_on date not null default (now() at time zone 'America/Lima')::date, status text not null check(status in ('draft','final')),
 observations text not null default '' check(length(observations)<=4000), agreements text not null default '' check(length(agreements)<=4000), pending text not null default '' check(length(pending)<=2000),
 next_due_date date, rule_version text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), revision bigint not null default 1
);
create table public.encounter_corrections (
 id uuid primary key default gen_random_uuid(), encounter_id uuid not null references public.encounters(id), reason text not null check(length(trim(reason)) between 5 and 2000),
 correction text not null check(length(trim(correction)) between 5 and 4000), created_by uuid not null references public.staff_profiles(id), created_at timestamptz not null default now()
);
create table public.followups (
 id uuid primary key default gen_random_uuid(), child_id uuid not null references public.children(id), appointment_id uuid unique references public.appointments(id),
 assigned_to uuid not null references public.staff_profiles(id), reason text not null check(length(trim(reason)) between 3 and 1000),
 status text not null default 'open' check(status in ('open','contacted','resolved')), next_action text not null default '' check(length(next_action)<=1000), next_date date,
 resolution text not null default '' check(length(resolution)<=1000), created_by uuid not null references public.staff_profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), revision bigint not null default 1
);
create table public.followup_contacts (
 id uuid primary key default gen_random_uuid(), followup_id uuid not null references public.followups(id), channel text not null check(channel in ('call','home_visit','other')),
 result text not null check(result in ('contacted','no_answer','invalid_contact')), notes text not null check(length(trim(notes)) between 3 and 2000),
 created_by uuid not null references public.staff_profiles(id), created_at timestamptz not null default now()
);
create table public.vaccine_records (
 id uuid primary key default gen_random_uuid(), child_id uuid not null references public.children(id), vaccine_name text not null check(length(trim(vaccine_name)) between 2 and 100),
 dose text not null check(length(trim(dose)) between 1 and 50), status text not null check(status in ('documented','pending','unverified')),
 applied_on date, source text not null check(length(trim(source)) between 3 and 200), notes text not null default '' check(length(notes)<=2000),
 supersedes_id uuid unique references public.vaccine_records(id), created_by uuid not null references public.staff_profiles(id), created_at timestamptz not null default now(),
 check(status<>'documented' or applied_on is not null)
);
create table public.audit_events (
 id bigint generated always as identity primary key, entity text not null, entity_id text not null, action text not null,
 actor_id uuid references public.staff_profiles(id), occurred_at timestamptz not null default now(), old_data jsonb, new_data jsonb
);

create function private.audit_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.audit_events(entity,entity_id,action,actor_id,old_data,new_data)
 values(tg_table_name,coalesce(to_jsonb(new)->>'id',to_jsonb(new)->>'date'),tg_op,auth.uid(),case when tg_op='UPDATE' then to_jsonb(old) end,to_jsonb(new));
 return new;
end; $$;
create function private.increment_revision() returns trigger language plpgsql set search_path = '' as $$
begin new.revision:=old.revision+1; new.updated_at:=now(); return new; end; $$;

create function private.validate_appointment() returns trigger language plpgsql set search_path = '' as $$
declare s public.facility_settings; local_start timestamp; local_end timestamp;
begin
 if tg_op='UPDATE' and new.status=old.status then return new; end if;
 if tg_op='INSERT' then
  select * into s from public.facility_settings where id=1;
  local_start:=new.starts_at at time zone 'America/Lima'; local_end:=new.ends_at at time zone 'America/Lima';
  if local_start::date < (now() at time zone 'America/Lima')::date then raise exception 'CRED: No se puede programar en una fecha pasada.'; end if;
  if not exists(select 1 from public.children where id=new.child_id and not archived and birth_date<=local_start::date and birth_date>(local_start::date-interval '12 years')) then raise exception 'CRED: El niño no está activo o está fuera del rango de edad CRED para esa fecha.'; end if;
  if not exists(select 1 from public.staff_profiles where id=new.nurse_id and active and role='nurse') then raise exception 'CRED: Selecciona una enfermera activa.'; end if;
  if new.room>s.room_count or local_start::date<>local_end::date or local_start::time<s.opens_at or local_end::time>s.closes_at
    or not (extract(dow from local_start)::integer=any(s.working_days)) or exists(select 1 from public.closed_days where date=local_start::date)
    then raise exception 'CRED: Horario o consultorio no disponible según la configuración.'; end if;
 end if;
 return new;
end; $$;
create trigger validate_appointment before insert or update on public.appointments for each row execute function private.validate_appointment();
create function private.create_absence_followup() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.status='no_show' and old.status<>'no_show' then
  insert into public.followups(child_id,appointment_id,assigned_to,reason,created_by,next_action)
  values(new.child_id,new.id,new.nurse_id,'Recuperar control por inasistencia',auth.uid(),'Contactar al cuidador') on conflict(appointment_id) do nothing;
 end if;
 return new;
end; $$;
create trigger absence_followup after update on public.appointments for each row execute function private.create_absence_followup();

do $$ declare t text; begin
 foreach t in array array['children','appointments','encounters','followups','facility_settings'] loop
  execute format('create trigger revision before update on public.%I for each row execute function private.increment_revision()',t);
 end loop;
 foreach t in array array['children','appointments','encounters','encounter_corrections','followups','followup_contacts','vaccine_records','facility_settings','closed_days','staff_profiles'] loop
  execute format('create trigger audit_change after insert or update on public.%I for each row execute function private.audit_change()',t);
 end loop;
 foreach t in array array['children','appointments','encounters','encounter_corrections','followups','followup_contacts','vaccine_records','facility_settings','closed_days'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy staff_read on public.%I for select to authenticated using (private.is_active_staff())',t);
 end loop;
end $$;
alter table public.audit_events enable row level security;
revoke all on public.audit_events from anon,authenticated;
grant select on public.audit_events to authenticated;
create policy admin_audit_read on public.audit_events for select to authenticated using(private.is_admin());

-- All writes are transactional, version checked and audited. No direct client mutation grants.
create function public.mutate_cred(action text, p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); cid uuid; rid uuid; a public.appointments; c public.children; e public.encounters; f public.followups; s public.facility_settings; target public.staff_profiles; new_status text;
begin
 if not private.is_active_staff() then raise exception 'CRED: Acceso no autorizado.' using errcode='42501'; end if;
 case action
 when 'save_child' then
  if (p->>'birth_date')::date>(now() at time zone 'America/Lima')::date or (p->>'birth_date')::date<=((now() at time zone 'America/Lima')::date-interval '12 years') then raise exception 'CRED: La fecha de nacimiento debe corresponder a un menor de 12 años.'; end if;
  if nullif(p->>'id','') is null then
   insert into public.children(full_name,document_type,document_number,birth_date,sex,history_number,guardian_name,guardian_relationship,phone,address,notes,created_by)
   values(trim(p->>'full_name'),p->>'document_type',upper(trim(p->>'document_number')),(p->>'birth_date')::date,p->>'sex',trim(coalesce(p->>'history_number','')),trim(p->>'guardian_name'),trim(p->>'guardian_relationship'),trim(p->>'phone'),trim(p->>'address'),coalesce(p->>'notes',''),uid) returning id into rid;
  else
   update public.children set full_name=trim(p->>'full_name'),document_type=p->>'document_type',document_number=upper(trim(p->>'document_number')),birth_date=(p->>'birth_date')::date,sex=p->>'sex',history_number=trim(coalesce(p->>'history_number','')),guardian_name=trim(p->>'guardian_name'),guardian_relationship=trim(p->>'guardian_relationship'),phone=trim(p->>'phone'),address=trim(p->>'address'),notes=coalesce(p->>'notes','')
   where id=(p->>'id')::uuid and revision=(p->>'revision')::bigint returning id into rid;
  end if;
 when 'archive_child' then
  if not private.is_admin() then raise exception 'CRED: Solo administración puede archivar.' using errcode='42501'; end if;
  if exists(select 1 from public.appointments where child_id=(p->>'id')::uuid and status in ('scheduled','arrived','in_progress')) then raise exception 'CRED: Resuelve primero las programaciones pendientes del niño.'; end if;
  update public.children set archived=(p->>'archived')::boolean where id=(p->>'id')::uuid and revision=(p->>'revision')::bigint returning id into rid;
 when 'book','reschedule' then
  if action='reschedule' then
   if length(trim(coalesce(p->>'reason','')))<5 then raise exception 'CRED: Indica el motivo de reprogramación.'; end if;
   update public.appointments set status='rescheduled',reason=p->>'reason' where id=(p->>'previous_id')::uuid and revision=(p->>'revision')::bigint and status in ('scheduled','arrived','no_show') returning * into a;
   if not found then raise exception 'CRED: La programación cambió. Actualiza la pantalla.' using errcode='40001'; end if;
   cid:=a.child_id;
  else cid:=(p->>'child_id')::uuid; end if;
  insert into public.appointments(child_id,nurse_id,starts_at,ends_at,room,reason,previous_id,created_by)
  values(cid,(p->>'nurse_id')::uuid,(p->>'starts_at')::timestamptz,(p->>'ends_at')::timestamptz,(p->>'room')::integer,coalesce(p->>'reason',''),case when action='reschedule' then a.id end,uid) returning id into rid;
 when 'appointment_status' then
  select * into a from public.appointments where id=(p->>'id')::uuid for update;
  if not found or a.revision<>(p->>'revision')::bigint then raise exception 'CRED: La programación cambió. Actualiza la pantalla.' using errcode='40001'; end if;
  new_status:=p->>'status';
  if not ((a.status='scheduled' and new_status in ('arrived','no_show','cancelled')) or (a.status='arrived' and new_status in ('in_progress','cancelled'))) then raise exception 'CRED: Cambio de estado no permitido.'; end if;
  if new_status in ('arrived','no_show','in_progress') and (a.starts_at at time zone 'America/Lima')::date>(now() at time zone 'America/Lima')::date then raise exception 'CRED: No se puede registrar asistencia de un día futuro.'; end if;
  if new_status='in_progress' and a.nurse_id<>uid then raise exception 'CRED: Solo la enfermera asignada puede iniciar el control.'; end if;
  if new_status='cancelled' and length(trim(coalesce(p->>'reason','')))<5 then raise exception 'CRED: Indica el motivo de cancelación.'; end if;
  update public.appointments set status=new_status,reason=case when new_status='cancelled' then p->>'reason' else reason end where id=a.id returning id into rid;
 when 'save_encounter' then
  select * into a from public.appointments where id=(p->>'appointment_id')::uuid for update;
  if not found or a.nurse_id<>uid or a.status not in ('arrived','in_progress') then raise exception 'CRED: Solo la enfermera asignada puede registrar un control iniciado.'; end if;
  select * into e from public.encounters where appointment_id=a.id;
  if found and (e.status='final' or e.revision<>coalesce((p->>'revision')::bigint,0)) then raise exception 'CRED: El registro cambió o ya fue finalizado.' using errcode='40001'; end if;
  if p->>'status' not in ('draft','final') then raise exception 'CRED: Estado de control no válido.'; end if;
  if p->>'status'='final' and length(trim(coalesce(p->>'observations','')))<5 then raise exception 'CRED: Registra el resultado antes de finalizar.'; end if;
  if coalesce(nullif(p->>'performed_on','')::date,(now() at time zone 'America/Lima')::date)<(a.starts_at at time zone 'America/Lima')::date or nullif(p->>'performed_on','')::date>(now() at time zone 'America/Lima')::date then raise exception 'CRED: La fecha real debe estar entre la programación y hoy.'; end if;
  if nullif(p->>'next_due_date','')::date<coalesce(nullif(p->>'performed_on','')::date,(now() at time zone 'America/Lima')::date) then raise exception 'CRED: La próxima fecha no puede ser anterior al control.'; end if;
  insert into public.encounters(appointment_id,child_id,nurse_id,performed_on,status,observations,agreements,pending,next_due_date,rule_version)
  select a.id,a.child_id,uid,coalesce(nullif(p->>'performed_on','')::date,(now() at time zone 'America/Lima')::date),p->>'status',coalesce(p->>'observations',''),coalesce(p->>'agreements',''),coalesce(p->>'pending',''),nullif(p->>'next_due_date','')::date,rule_version from public.facility_settings where id=1
  on conflict(appointment_id) do update set status=excluded.status,performed_on=excluded.performed_on,observations=excluded.observations,agreements=excluded.agreements,pending=excluded.pending,next_due_date=excluded.next_due_date returning id into rid;
  update public.appointments set status=case when p->>'status'='final' then 'completed' else 'in_progress' end where id=a.id;
  if p->>'status'='final' and length(trim(coalesce(p->>'pending','')))>0 then
   insert into public.followups(child_id,assigned_to,reason,next_action,next_date,created_by) values(a.child_id,uid,'Pendientes del control CRED',p->>'pending',nullif(p->>'next_due_date','')::date,uid);
  end if;
 when 'correct_encounter' then
  select * into e from public.encounters where id=(p->>'encounter_id')::uuid;
  if not found or e.nurse_id<>uid or e.status<>'final' then raise exception 'CRED: Solo la autora puede agregar una corrección al registro finalizado.'; end if;
  insert into public.encounter_corrections(encounter_id,reason,correction,created_by) values(e.id,p->>'reason',p->>'correction',uid) returning id into rid;
 when 'create_followup' then
  if not exists(select 1 from public.staff_profiles where id=(p->>'assigned_to')::uuid and active) then raise exception 'CRED: Responsable no disponible.'; end if;
  insert into public.followups(child_id,assigned_to,reason,next_action,next_date,created_by) values((p->>'child_id')::uuid,(p->>'assigned_to')::uuid,p->>'reason',coalesce(p->>'next_action',''),nullif(p->>'next_date','')::date,uid) returning id into rid;
 when 'contact','resolve_followup' then
  select * into f from public.followups where id=(p->>'id')::uuid for update;
  if not found or f.revision<>(p->>'revision')::bigint or f.status='resolved' then raise exception 'CRED: El seguimiento cambió o ya está resuelto.' using errcode='40001'; end if;
  if action='contact' then
   insert into public.followup_contacts(followup_id,channel,result,notes,created_by) values(f.id,p->>'channel',p->>'result',p->>'notes',uid);
   update public.followups set status=case when p->>'result'='contacted' then 'contacted' else status end,next_action=p->>'next_action',next_date=nullif(p->>'next_date','')::date where id=f.id returning id into rid;
  else
   if length(trim(coalesce(p->>'resolution','')))<5 then raise exception 'CRED: Indica cómo se resolvió el seguimiento.'; end if;
   update public.followups set status='resolved',resolution=p->>'resolution',next_action='',next_date=null where id=f.id returning id into rid;
  end if;
 when 'save_vaccine' then
  select * into c from public.children where id=(p->>'child_id')::uuid;
  if not found or c.archived then raise exception 'CRED: Niño no disponible.'; end if;
  if nullif(p->>'applied_on','')::date<c.birth_date or nullif(p->>'applied_on','')::date>(now() at time zone 'America/Lima')::date then raise exception 'CRED: Fecha de vacuna fuera del rango válido.'; end if;
  if nullif(p->>'supersedes_id','') is not null and not exists(select 1 from public.vaccine_records where id=(p->>'supersedes_id')::uuid and child_id=c.id) then raise exception 'CRED: Antecedente a corregir no válido.'; end if;
  insert into public.vaccine_records(child_id,vaccine_name,dose,status,applied_on,source,notes,supersedes_id,created_by)
  values(c.id,trim(p->>'vaccine_name'),trim(p->>'dose'),p->>'status',nullif(p->>'applied_on','')::date,trim(p->>'source'),coalesce(p->>'notes',''),nullif(p->>'supersedes_id','')::uuid,uid) returning id into rid;
 when 'save_settings' then
  if not private.is_admin() then raise exception 'CRED: Solo administración puede configurar el establecimiento.' using errcode='42501'; end if;
  if (p->>'rules_approved')::boolean and p->>'rule_version'<>'NTS 238 / 2025' then raise exception 'CRED: Esta versión de reglas requiere implementación y validación antes de habilitarla.'; end if;
  update public.facility_settings set display_name=trim(p->>'display_name'),opens_at=(p->>'opens_at')::time,closes_at=(p->>'closes_at')::time,slot_minutes=(p->>'slot_minutes')::integer,room_count=(p->>'room_count')::integer,working_days=array(select jsonb_array_elements_text(p->'working_days')::integer),rule_version=trim(p->>'rule_version'),rule_source=p->>'rule_source',rules_approved=(p->>'rules_approved')::boolean,approved_by=case when (p->>'rules_approved')::boolean then uid end,approved_at=case when (p->>'rules_approved')::boolean then now() end
  where id=1 and revision=(p->>'revision')::bigint;
  if not found then raise exception 'CRED: La configuración cambió. Actualiza.' using errcode='40001'; end if;
  return jsonb_build_object('id',1);
 when 'closed_day' then
  if not private.is_admin() then raise exception 'CRED: Solo administración puede modificar días cerrados.' using errcode='42501'; end if;
  if coalesce((p->>'reopen')::boolean,false) then
   delete from public.closed_days where date=(p->>'date')::date;
   insert into public.audit_events(entity,entity_id,action,actor_id) values('closed_days',p->>'date','REOPEN',uid);
  else
   if exists(select 1 from public.appointments where (starts_at at time zone 'America/Lima')::date=(p->>'date')::date and status in ('scheduled','arrived','in_progress')) then raise exception 'CRED: Reprograma primero los controles de ese día.'; end if;
   insert into public.closed_days(date,reason) values((p->>'date')::date,p->>'reason') on conflict(date) do update set reason=excluded.reason;
  end if;
  return jsonb_build_object('date',p->>'date');
 when 'save_staff' then
  if not private.is_admin() then raise exception 'CRED: Solo administración puede gestionar perfiles.' using errcode='42501'; end if;
  -- Serialize staff changes to prevent two admins disabling the last active admin concurrently.
  perform pg_advisory_xact_lock(5222);
  select * into target from public.staff_profiles where id=(p->>'id')::uuid for update;
  if found and target.role='admin' and target.active and ((p->>'role')<>'admin' or not (p->>'active')::boolean) and (select count(*) from public.staff_profiles where active and role='admin')<=1 then raise exception 'CRED: Debe quedar al menos un administrador activo.'; end if;
  insert into public.staff_profiles(id,full_name,role,active) values((p->>'id')::uuid,trim(p->>'full_name'),p->>'role',(p->>'active')::boolean)
  on conflict(id) do update set full_name=excluded.full_name,role=excluded.role,active=excluded.active returning id into rid;
 else raise exception 'CRED: Operación desconocida.';
 end case;
 if rid is null then raise exception 'CRED: El registro cambió. Actualiza antes de guardar.' using errcode='40001'; end if;
 return jsonb_build_object('id',rid);
end; $$;
revoke all on function public.mutate_cred(text,jsonb) from public, anon;
grant execute on function public.mutate_cred(text,jsonb) to authenticated;
revoke all on function private.audit_change(),private.increment_revision(),private.validate_appointment(),private.create_absence_followup() from public;
-- Supabase normally provides this publication. Local PostgreSQL tests need no Realtime service.
do $$ declare t text; begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  foreach t in array array['children','appointments','encounters','encounter_corrections','followups','followup_contacts','vaccine_records','facility_settings','closed_days','staff_profiles'] loop
   if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
    execute format('alter publication supabase_realtime add table public.%I',t);
   end if;
  end loop;
 end if;
end $$;
commit;
