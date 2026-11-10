// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
const admin = '10000000-0000-0000-0000-000000000001',
  nurse = '10000000-0000-0000-0000-000000000002',
  other = '10000000-0000-0000-0000-000000000003',
  inactive = '10000000-0000-0000-0000-000000000004',
  manager = '10000000-0000-0000-0000-000000000005';
const pg = new PGlite({ extensions: { btree_gist } });
async function act(action: string, p: Record<string, unknown>) {
  const result = await pg.query<{ value: { id: string } }>(
    'select public.mutate_cred($1,$2::jsonb) as value',
    [action, JSON.stringify(p)],
  );
  return result.rows[0].value;
}
async function asUser(id: string) {
  await pg.exec(
    `set local role authenticated; select set_config('request.jwt.claim.sub','${id}',true);`,
  );
}
const childData = {
  full_name: 'Niña de prueba',
  document_type: 'DNI',
  document_number: '00123456',
  birth_date: '2025-01-01',
  sex: 'F',
  guardian_name: 'Cuidadora de prueba',
  guardian_relationship: 'Madre',
  phone: '999000000',
  address: 'Dirección ficticia',
  history_number: '',
  notes: '',
};
let date: string;
async function makeChild() {
  return (await act('save_child', childData)).id;
}
async function book(child_id: string, time = '09:00', nurse_id = nurse, room = 1) {
  return act('book', {
    child_id,
    nurse_id,
    room,
    starts_at: `${date}T${time}:00-05:00`,
    ends_at: `${date}T${time === '09:00' ? '09:30' : time === '09:15' ? '09:45' : '10:00'}:00-05:00`,
  });
}
beforeAll(async () => {
  await pg.exec(
    `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema public,auth to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const name of [
    '202611060001_staff_profiles.sql',
    '202611060002_agenda_modules.sql',
    '202611060003_manager_accounts.sql',
  ])
    await pg.exec(
      await readFile(new URL(`../../supabase/migrations/${name}`, import.meta.url), 'utf8'),
    );
  for (const [id, role, active] of [
    [admin, 'admin', true],
    [nurse, 'nurse', true],
    [other, 'nurse', true],
    [inactive, 'nurse', false],
    [manager, 'manager', true],
  ] as const) {
    await pg.query('insert into auth.users values($1)', [id]);
    await pg.query(
      'insert into public.staff_profiles(id,full_name,role,active) values($1,$2,$3,$4)',
      [id, 'Personal prueba', role, active],
    );
  }
  await pg.query('insert into auth.users values($1)', ['10000000-0000-0000-0000-000000000006']);
  await pg.exec(
    await readFile(
      new URL('../../supabase/migrations/202611060004_usernames.sql', import.meta.url),
      'utf8',
    ),
  );
  await pg.exec(
    await readFile(
      new URL('../../supabase/migrations/202611090005_consistency.sql', import.meta.url),
      'utf8',
    ),
  );
  await pg.exec(
    await readFile(
      new URL('../../supabase/migrations/202611090006_followup_nurses.sql', import.meta.url),
      'utf8',
    ),
  );
  await pg.exec(
    await readFile(
      new URL('../../supabase/migrations/202611090007_room_aliases.sql', import.meta.url),
      'utf8',
    ),
  );
  await pg.exec('update public.facility_settings set working_days=array[0,1,2,3,4,5,6]');
  const result = await pg.query<{ date: string }>(
    `select to_char(now() at time zone 'America/Lima','YYYY-MM-DD') as date`,
  );
  date = result.rows[0].date;
}, 60000);
afterAll(() => pg.close());
beforeEach(async () => {
  await pg.exec('begin');
  await asUser(nurse);
});
afterEach(async () => {
  await pg.exec('rollback');
});
describe('PostgreSQL authorization and workflows', () => {
  it('allows a manager to save room aliases and rejects stale revisions', async () => {
    await asUser(manager);
    const { rows } = await pg.query<{ revision: number }>(
      'select revision from public.facility_settings',
    );
    const payload = { revision: rows[0].revision, room_aliases: { '1': 'CRED A' } };
    await act('save_room_aliases', payload);
    expect(
      (
        await pg.query<{ room_aliases: unknown }>(
          'select room_aliases from public.facility_settings',
        )
      ).rows[0].room_aliases,
    ).toEqual({ '1': 'CRED A' });
    await expect(act('save_room_aliases', payload)).rejects.toThrow('configuración cambió');
  });
  it('rejects room alias changes from nursing', async () => {
    await expect(
      act('save_room_aliases', { revision: 1, room_aliases: { '1': 'Prueba' } }),
    ).rejects.toThrow('Solo administración');
  });

  it.each([admin, manager, inactive])(
    'rejects a follow-up assigned to a non-nurse or inactive account %s',
    async (assigned_to) => {
      const child_id = await makeChild();
      await expect(
        act('create_followup', { child_id, assigned_to, reason: 'Prueba de seguimiento' }),
      ).rejects.toThrow('enfermera activa');
    },
  );
  it('accepts a follow-up assigned to an active nurse', async () => {
    const child_id = await makeChild();
    expect(
      (
        await act('create_followup', {
          child_id,
          assigned_to: nurse,
          reason: 'Prueba de seguimiento',
        })
      ).id,
    ).toBeTruthy();
  });

  it.each(['appointment_status', 'contact', 'resolve_followup'])(
    'rejects missing revisions for %s',
    async (action) => {
      await expect(act(action, {})).rejects.toThrow('Falta la versión');
    },
  );
  it.each(['appointment_status', 'contact', 'resolve_followup'])(
    'rejects invalid revisions for %s',
    async (action) => {
      await expect(act(action, { revision: 0 })).rejects.toThrow('Versión del registro no válida');
    },
  );

  it('assigns unique aliases to existing accounts without replacing identities', async () => {
    await asUser(admin);
    const rows = (
      await pg.query<{ id: string; username: string }>(
        'select id,username from public.staff_profiles',
      )
    ).rows;
    expect(rows.find((s) => s.id === admin)?.username).toBe('admin');
    expect(rows.find((s) => s.id === manager)?.username).toBe('responsable');
    expect(rows.find((s) => s.id === nurse)?.username).toBe('enf1');
    expect(new Set(rows.map((s) => s.username)).size).toBe(5);
  });
  it('normalizes a nurse alias in the checked manager operation', async () => {
    await asUser(manager);
    await act('save_staff', {
      id: nurse,
      full_name: 'Enfermera prueba',
      role: 'nurse',
      active: true,
      username: ' ANA.PEREZ ',
    });
    expect(
      (
        await pg.query<{ username: string }>(
          'select username from public.staff_profiles where id=$1',
          [nurse],
        )
      ).rows[0].username,
    ).toBe('ana.perez');
  });
  it('rejects duplicate usernames and rolls back the whole profile change', async () => {
    await asUser(manager);
    await pg.exec('savepoint duplicate_alias');
    await expect(
      act('save_staff', {
        id: nurse,
        full_name: 'Nombre reemplazado',
        role: 'nurse',
        active: true,
        username: 'admin',
      }),
    ).rejects.toThrow(/staff_username_unique/);
    await pg.exec('rollback to savepoint duplicate_alias');
    expect(
      (
        await pg.query<{ full_name: string }>(
          'select full_name from public.staff_profiles where id=$1',
          [nurse],
        )
      ).rows[0].full_name,
    ).toBe('Personal prueba');
  });
  it('authorizes manager reset requests only for nursing staff and audits without credentials', async () => {
    await asUser(manager);
    await act('authorize_password_reset', { id: nurse });
    await asUser(admin);
    const logs = (
      await pg.query<{ action: string; actor_id: string }>(
        'select action,actor_id from public.audit_events where action=$1',
        ['PASSWORD_RESET_REQUEST'],
      )
    ).rows;
    expect(logs).toEqual([{ action: 'PASSWORD_RESET_REQUEST', actor_id: manager }]);
  });
  it.each([admin, manager])(
    'blocks manager password reset of a privileged profile %s',
    async (id) => {
      await asUser(manager);
      await expect(act('authorize_password_reset', { id })).rejects.toThrow(/No tienes permiso/);
    },
  );
  it('blocks nursing staff from resetting anyone else', async () => {
    await expect(act('authorize_password_reset', { id: other })).rejects.toThrow(
      /No tienes permiso/,
    );
  });
  it('permits administrator recovery of a responsible account', async () => {
    await asUser(admin);
    expect(await act('authorize_password_reset', { id: manager })).toEqual({ id: manager });
  });
  it('keeps the previous dispatcher private', async () => {
    await asUser(manager);
    await expect(
      pg.query('select private.manage_cred_v3($1,$2::jsonb)', ['save_staff', '{}']),
    ).rejects.toThrow(/permission denied/);
  });
  it('enforces durable login attempt limits accessible only to the server', async () => {
    await pg.exec('set local role service_role');
    for (let i = 0; i < 10; i++)
      expect(
        (
          await pg.query<{ allowed: boolean }>(
            'select public.take_staff_login_attempt($1) as allowed',
            ['enf1'],
          )
        ).rows[0].allowed,
      ).toBe(true);
    expect(
      (
        await pg.query<{ allowed: boolean }>(
          'select public.take_staff_login_attempt($1) as allowed',
          ['enf1'],
        )
      ).rows[0].allowed,
    ).toBe(false);
    await pg.exec('reset role');
    await pg.exec(
      "update private.staff_login_limits set window_started=clock_timestamp()-interval '6 minutes'",
    );
    await pg.exec('set local role service_role');
    expect(
      (
        await pg.query<{ allowed: boolean }>(
          'select public.take_staff_login_attempt($1) as allowed',
          ['enf1'],
        )
      ).rows[0].allowed,
    ).toBe(true);
  });
  it('denies anonymous direct use of the private login service', async () => {
    await pg.exec('set local role anon');
    await expect(pg.query('select public.take_staff_login_attempt($1)', ['enf1'])).rejects.toThrow(
      /permission denied/,
    );
  });
  it('lets the manager provision a nurse for a newly created Auth identity', async () => {
    await asUser(manager);
    const id = '10000000-0000-0000-0000-000000000006';
    await act('save_staff', { id, full_name: 'Enfermera nueva', role: 'nurse', active: true });
    expect(
      (await pg.query('select role,active from public.staff_profiles where id=$1', [id])).rows,
    ).toEqual([{ role: 'nurse', active: true }]);
  });
  it('allows a manager to manage nurses and leaves an audit record with the caller', async () => {
    await asUser(manager);
    await act('save_staff', {
      id: inactive,
      full_name: 'Enfermera habilitada',
      role: 'nurse',
      active: true,
    });
    expect(
      (
        await pg.query<{ active: boolean }>(
          'select active from public.staff_profiles where id=$1',
          [inactive],
        )
      ).rows[0].active,
    ).toBe(true);
    expect((await pg.query('select * from public.audit_events')).rows).toHaveLength(0);
    await asUser(admin);
    expect(
      (
        await pg.query(
          'select actor_id from public.audit_events where entity=$1 and actor_id is not null',
          ['staff_profiles'],
        )
      ).rows,
    ).toEqual([{ actor_id: manager }]);
  });
  it.each([
    ['admin', admin, 'nurse'],
    ['manager', manager, 'nurse'],
    ['promotion', nurse, 'admin'],
  ])('blocks manager escalation: %s', async (_name, id, role) => {
    await asUser(manager);
    await expect(
      act('save_staff', { id, role, full_name: 'Intento no autorizado', active: true }),
    ).rejects.toThrow(/solo puede gestionar perfiles de enfermería/);
  });
  it('keeps the clinical implementation inaccessible even with a forged direct RPC', async () => {
    await asUser(manager);
    await expect(
      pg.query('select private.mutate_cred($1,$2::jsonb)', ['save_staff', '{}']),
    ).rejects.toThrow(/permission denied/);
  });
  it('allows only an administrator to assign the manager role', async () => {
    await asUser(admin);
    await act('save_staff', {
      id: other,
      role: 'manager',
      full_name: 'Responsable prueba',
      active: true,
    });
    expect(
      (
        await pg.query<{ role: string }>('select role from public.staff_profiles where id=$1', [
          other,
        ])
      ).rows[0].role,
    ).toBe('manager');
  });
  it('allows operational settings without changing CRED approval or facility identity', async () => {
    await asUser(manager);
    const before = (
      await pg.query(
        'select display_name,rule_version,rule_source,rules_approved,approved_by,approved_at from public.facility_settings',
      )
    ).rows[0];
    const revision = (
      await pg.query<{ revision: number }>('select revision from public.facility_settings')
    ).rows[0].revision;
    await act('save_operational_settings', {
      revision,
      opens_at: '07:00',
      closes_at: '14:00',
      slot_minutes: 30,
      room_count: 3,
      working_days: [1, 2, 3, 4, 5],
    });
    expect(
      (
        await pg.query(
          'select display_name,rule_version,rule_source,rules_approved,approved_by,approved_at from public.facility_settings',
        )
      ).rows[0],
    ).toEqual(before);
    expect(
      (await pg.query('select room_count,revision from public.facility_settings')).rows[0],
    ).toMatchObject({ room_count: 3, revision: revision + 1 });
  });
  it('rejects hidden normative fields in operational settings', async () => {
    await asUser(manager);
    await expect(
      act('save_operational_settings', { revision: 1, rules_approved: true }),
    ).rejects.toThrow(/Solo puedes modificar horarios/);
  });
  it('rejects manager use of the full administrator settings action', async () => {
    await asUser(manager);
    await expect(act('save_settings', { rules_approved: true })).rejects.toThrow(
      /Solo administración/,
    );
  });
  it('prevents nurses from creating accounts and managing schedules', async () => {
    await expect(
      act('save_staff', { id: other, role: 'nurse', full_name: 'Nombre prueba', active: true }),
    ).rejects.toThrow(/Solo administración/);
  });
  it('allows manager closure and reopening with audit', async () => {
    await asUser(manager);
    await act('closed_day', { date, reason: 'Mantenimiento del consultorio' });
    expect((await pg.query('select * from public.closed_days')).rows).toHaveLength(1);
    await act('closed_day', { date, reopen: true });
    expect((await pg.query('select * from public.closed_days')).rows).toHaveLength(0);
  });
  it('blocks a disabled manager using an existing session', async () => {
    await asUser(admin);
    await act('save_staff', {
      id: manager,
      role: 'manager',
      full_name: 'Responsable prueba',
      active: false,
    });
    await asUser(manager);
    expect((await pg.query('select * from public.children')).rows).toHaveLength(0);
    await expect(
      act('save_staff', { id: other, role: 'nurse', full_name: 'Nombre prueba', active: true }),
    ).rejects.toThrow(/Acceso no autorizado/);
  });
  it('blocks anonymous and disabled staff from reading or writing', async () => {
    await asUser(inactive);
    expect((await pg.query('select * from public.children')).rows).toHaveLength(0);
    await expect(act('save_child', childData)).rejects.toThrow(/Acceso no autorizado/);
  });
  it('prevents direct mutations and self privilege escalation', async () => {
    await expect(
      pg.query(`update public.staff_profiles set role='admin' where id=$1`, [nurse]),
    ).rejects.toThrow(/permission denied/);
  });
  it('preserves leading zeros and blocks duplicate documents', async () => {
    await makeChild();
    const result = await pg.query<{ document_number: string }>(
      'select document_number from public.children',
    );
    expect(result.rows[0].document_number).toBe('00123456');
    await expect(makeChild()).rejects.toThrow(/duplicate key/);
  });
  it('blocks stale revisions rather than overwriting another nurse', async () => {
    const id = await makeChild();
    await act('save_child', { ...childData, id, revision: 1, phone: '999222333' });
    await expect(act('save_child', { ...childData, id, revision: 1 })).rejects.toThrow(
      /registro cambió/,
    );
  });
  it('catches partial overlaps in the database', async () => {
    const id = await makeChild();
    await book(id);
    const another = (await act('save_child', { ...childData, document_number: '87654321' })).id;
    await expect(book(another, '09:15', nurse, 2)).rejects.toThrow(/exclusion constraint/);
  });
  it('also blocks overlaps for the same room with different nurses', async () => {
    const id = await makeChild();
    await book(id);
    const another = (await act('save_child', { ...childData, document_number: '87654321' })).id;
    await expect(book(another, '09:15', other, 1)).rejects.toThrow(/exclusion constraint/);
  });
  it('blocks a child from occupying two different rooms at the same time', async () => {
    const id = await makeChild();
    await book(id);
    await expect(book(id, '09:15', other, 2)).rejects.toThrow(/exclusion constraint/);
  });
  it('creates exactly one followup for an absence', async () => {
    const id = await makeChild(),
      a = await book(id);
    await act('appointment_status', { id: a.id, revision: 1, status: 'no_show' });
    expect((await pg.query('select * from public.followups')).rows).toHaveLength(1);
  });
  it('rolls back a reprogramming if the new slot collides', async () => {
    const c = await makeChild(),
      a = await book(c);
    const c2 = (await act('save_child', { ...childData, document_number: '87654321' })).id;
    await book(c2, '09:30');
    await pg.exec('savepoint before_change');
    await expect(
      act('reschedule', {
        previous_id: a.id,
        revision: 1,
        nurse_id: nurse,
        room: 1,
        starts_at: `${date}T09:30:00-05:00`,
        ends_at: `${date}T10:00:00-05:00`,
        reason: 'Cuidador solicita cambio',
      }),
    ).rejects.toThrow(/exclusion constraint/);
    await pg.exec('rollback to before_change');
    const rows = await pg.query<{ status: string }>(
      'select status from public.appointments where id=$1',
      [a.id],
    );
    expect(rows.rows[0].status).toBe('scheduled');
  });
  it('allows only the assigned nurse to finish and preserves finalized records', async () => {
    const c = await makeChild(),
      a = await book(c);
    await act('appointment_status', { id: a.id, revision: 1, status: 'arrived' });
    await pg.exec('savepoint before_other');
    await asUser(other);
    await expect(
      act('save_encounter', {
        appointment_id: a.id,
        status: 'final',
        observations: 'Control realizado',
      }),
    ).rejects.toThrow(/enfermera asignada/);
    await pg.exec('rollback to before_other');
    await asUser(nurse);
    const e = await act('save_encounter', {
      appointment_id: a.id,
      status: 'final',
      observations: 'Control realizado',
    });
    const result = await pg.query<{ status: string }>(
      'select status from public.appointments where id=$1',
      [a.id],
    );
    expect(result.rows[0].status).toBe('completed');
    await act('correct_encounter', {
      encounter_id: e.id,
      reason: 'Aclaración de registro',
      correction: 'Se añade una aclaración sin modificar original',
    });
    expect((await pg.query('select * from public.encounter_corrections')).rows).toHaveLength(1);
  });
  it('prevents removing the last administrator', async () => {
    await asUser(admin);
    await expect(
      act('save_staff', {
        id: admin,
        full_name: 'Administración prueba',
        role: 'nurse',
        active: false,
      }),
    ).rejects.toThrow(/administrador activo/);
  });
  it('records changes in an audit visible only to administration', async () => {
    await makeChild();
    expect((await pg.query('select * from public.staff_profiles')).rows.length).toBe(5);
    await pg.exec('savepoint before_audit');
    await expect(pg.query('select * from public.audit_events')).resolves.toMatchObject({
      rows: [],
    });
    await asUser(admin);
    const result = await pg.query('select * from public.audit_events where entity=$1', [
      'children',
    ]);
    expect(result.rows.length).toBe(1);
  });
  it('refuses anonymous RPC execution', async () => {
    await pg.exec('set local role anon');
    await expect(act('save_child', childData)).rejects.toThrow(/permission denied/);
  });
  it('keeps draft encounters out of completed controls and creates pending tasks on finalization', async () => {
    const c = await makeChild(),
      a = await book(c);
    await act('appointment_status', { id: a.id, revision: 1, status: 'arrived' });
    const e = await act('save_encounter', {
      appointment_id: a.id,
      status: 'draft',
      observations: 'Registro en elaboración',
    });
    expect(
      (
        await pg.query<{ status: string }>('select status from public.appointments where id=$1', [
          a.id,
        ])
      ).rows[0].status,
    ).toBe('in_progress');
    await act('save_encounter', {
      appointment_id: a.id,
      revision: 1,
      status: 'final',
      observations: 'Control realizado',
      pending: 'Verificar referencia',
    });
    expect((await pg.query('select * from public.followups')).rows).toHaveLength(1);
    expect(
      (
        await pg.query<{ status: string }>('select status from public.encounters where id=$1', [
          e.id,
        ])
      ).rows[0].status,
    ).toBe('final');
  });
  it('records contact without confusing it with a completed control', async () => {
    const c = await makeChild(),
      a = await book(c);
    await act('appointment_status', { id: a.id, revision: 1, status: 'no_show' });
    const f = (await pg.query<{ id: string }>('select id from public.followups')).rows[0];
    await act('contact', {
      id: f.id,
      revision: 1,
      channel: 'call',
      result: 'contacted',
      notes: 'La cuidadora solicita nuevo horario',
      next_action: 'Coordinar fecha',
    });
    expect(
      (
        await pg.query<{ status: string }>('select status from public.appointments where id=$1', [
          a.id,
        ])
      ).rows[0].status,
    ).toBe('no_show');
    await act('resolve_followup', {
      id: f.id,
      revision: 2,
      resolution: 'Seguimiento resuelto según registro',
    });
    expect(
      (await pg.query<{ status: string }>('select status from public.followups')).rows[0].status,
    ).toBe('resolved');
  });
  it('requires dates for documented vaccinations and preserves superseded records', async () => {
    const c = await makeChild();
    const v = await act('save_vaccine', {
      child_id: c,
      vaccine_name: 'Antecedente prueba',
      dose: 'Primera',
      status: 'unverified',
      source: 'Carné por revisar',
    });
    await act('save_vaccine', {
      child_id: c,
      vaccine_name: 'Antecedente prueba',
      dose: 'Primera',
      status: 'documented',
      applied_on: date,
      source: 'Carné revisado',
      supersedes_id: v.id,
    });
    expect((await pg.query('select * from public.vaccine_records')).rows).toHaveLength(2);
  });
});
