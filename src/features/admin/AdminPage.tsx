import { DateInput } from '../../shared/ui/DateInput';
import { useEffect, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { db, useData, messageFor } from '../../shared/lib/data';
import type { AuditEvent, Staff, StaffRole } from '../../shared/types';
import {
  assignableRoles,
  canManageProfile,
  canManageTeam,
  roleLabels,
} from '../../shared/lib/permissions';
import { Field, Form, text } from '../../shared/ui/Forms';
import { Modal } from '../../shared/ui/Modal';
import { showDate, todayLima } from '../../shared/lib/dates';
export default function AdminPage() {
  const profile = useOutletContext<Staff>(),
    data = useData();
  const [tab, setTab] = useState('Configuración'),
    [edit, setEdit] = useState<Staff>(),
    [reset, setReset] = useState<Staff>(),
    [closed, setClosed] = useState(false),
    [invite, setInvite] = useState(false);
  const [audit, setAudit] = useState<AuditEvent[]>([]),
    [error, setError] = useState('');
  useEffect(() => {
    if (profile.role !== 'admin' || tab !== 'Auditoría') return;
    let alive = true;
    void db()
      .from('audit_events')
      .select('id,entity,entity_id,action,actor_id,occurred_at')
      .order('occurred_at', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (alive) {
          if (error) setError(messageFor(error));
          else {
            setAudit(data as AuditEvent[]);
            setError('');
          }
        }
      });
    return () => {
      alive = false;
    };
  }, [profile.role, tab]);
  if (!canManageTeam(profile.role)) return <Navigate to="/agenda" replace />;
  const isAdmin = profile.role === 'admin';
  const settings = data.settings;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="overline">
            {isAdmin ? 'ADMINISTRACIÓN DEL ESTABLECIMIENTO' : 'GESTIÓN DEL CONSULTORIO'}
          </p>
          <h1>Un equipo, una agenda.</h1>
          <p>Horarios, personal y trazabilidad de CSMI El Milagro.</p>
          {!isAdmin && (
            <p className="hint">
              Puedes gestionar enfermería y horarios. Los permisos de administración y las reglas
              CRED los gestiona el administrador.
            </p>
          )}
        </div>
      </div>
      <nav className="content-tabs" aria-label="Administración">
        {[
          'Configuración',
          ...(isAdmin ? ['Días cerrados'] : []),
          'Personal',
          ...(isAdmin ? ['Auditoría'] : []),
        ].map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      {tab === 'Configuración' && settings && (
        <section className="surface">
          <h2>{isAdmin ? 'Horarios y reglas del consultorio' : 'Horarios del consultorio'}</h2>
          <Form
            key={settings.revision}
            action={isAdmin ? 'save_settings' : 'save_operational_settings'}
            onSuccess={() => {}}
            payload={(f) => ({
              ...Object.fromEntries(f),
              revision: settings.revision,
              slot_minutes: Number(f.get('slot_minutes')),
              room_count: Number(f.get('room_count')),
              working_days: f.getAll('working_days').map(Number),
              ...(isAdmin ? { rules_approved: f.get('rules_approved') === 'on' } : {}),
            })}
          >
            {isAdmin && (
              <div className="full">
                <Field label="Nombre visible del establecimiento">
                  <input
                    name="display_name"
                    defaultValue={settings.display_name}
                    required
                    minLength={3}
                    maxLength={120}
                  />
                </Field>
              </div>
            )}
            <Field label="Inicio de atención">
              <input
                name="opens_at"
                type="time"
                defaultValue={settings.opens_at.slice(0, 5)}
                required
              />
            </Field>
            <Field label="Fin de atención">
              <input
                name="closes_at"
                type="time"
                defaultValue={settings.closes_at.slice(0, 5)}
                required
              />
            </Field>
            <Field label="Duración base (minutos)">
              <input
                name="slot_minutes"
                type="number"
                min={15}
                max={120}
                defaultValue={settings.slot_minutes}
                required
              />
            </Field>
            <Field label="Número de consultorios">
              <input
                name="room_count"
                type="number"
                min={1}
                max={20}
                defaultValue={settings.room_count}
                required
              />
            </Field>
            <div className="full">
              <p className="field-heading">Días de atención</p>
              <div className="row-actions">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d, i) => (
                  <label className="inline-check" key={d}>
                    <input
                      type="checkbox"
                      name="working_days"
                      value={i}
                      defaultChecked={settings.working_days.includes(i)}
                    />
                    {d}
                  </label>
                ))}
              </div>
            </div>
            {isAdmin && (
              <>
                <div className="full">
                  <Field label="Versión de la norma CRED">
                    <input
                      name="rule_version"
                      defaultValue={settings.rule_version}
                      required
                      minLength={3}
                      maxLength={120}
                    />
                  </Field>
                </div>
                <div className="full">
                  <Field label="Enlace oficial de referencia">
                    <input
                      name="rule_source"
                      type="url"
                      pattern="https://.*"
                      defaultValue={settings.rule_source}
                      required
                    />
                  </Field>
                </div>
                <label className="inline-check full">
                  <input
                    name="rules_approved"
                    type="checkbox"
                    defaultChecked={settings.rules_approved}
                  />
                  Confirmo la revisión local de las reglas CRED para habilitar propuestas de fecha
                  sujetas a confirmación profesional.
                </label>
                <p className="hint full">
                  La aprobación conserva responsable y fecha. Cambiar el texto de versión no instala
                  reglas médicas nuevas. Las modificaciones de horarios no reprograman citas
                  existentes.
                </p>
              </>
            )}
            {!isAdmin && (
              <p className="hint full">
                Los cambios de horario no reprograman las citas existentes.
              </p>
            )}
          </Form>
          <h2>Alias de consultorios</h2>
          <Form
            key={'rooms-' + settings.revision}
            action="save_room_aliases"
            submitLabel="Guardar alias"
            onSuccess={() => {}}
            payload={(f) => ({
              revision: settings.revision,
              room_aliases: {
                ...settings.room_aliases,
                ...Object.fromEntries(
                  Array.from({ length: settings.room_count }, (_, i) => [
                    String(i + 1),
                    text(f, 'room_' + (i + 1)),
                  ]),
                ),
              },
            })}
          >
            {Array.from({ length: settings.room_count }, (_, i) => (
              <Field key={i} label={'Alias del consultorio ' + (i + 1) + ' (opcional)'}>
                <input
                  name={'room_' + (i + 1)}
                  defaultValue={settings.room_aliases?.[String(i + 1)] || ''}
                  maxLength={40}
                  placeholder="Ej. CRED A"
                />
              </Field>
            ))}
          </Form>
        </section>
      )}
      {isAdmin && tab === 'Días cerrados' && (
        <section className="surface">
          <div className="section-heading">
            <h2>Feriados y cierres del consultorio</h2>
            <button className="button primary" onClick={() => setClosed(true)}>
              + Registrar cierre
            </button>
          </div>
          {data.closedDays.map((d) => (
            <div className="history-record" key={d.date}>
              <h3>{showDate(d.date)}</h3>
              <p>{d.reason}</p>
              <Form
                action="closed_day"
                onSuccess={() => {}}
                submitLabel="Reabrir día"
                payload={() => ({ date: d.date, reopen: true })}
              >
                <p className="hint full">
                  Reabrir permitirá nuevas programaciones según el horario habitual.
                </p>
              </Form>
            </div>
          ))}
          {!data.closedDays.length && (
            <div className="empty-state">No hay cierres extraordinarios registrados.</div>
          )}
        </section>
      )}
      {tab === 'Personal' && (
        <section className="surface">
          <div className="section-heading">
            <h2>Cuentas del equipo</h2>
            <div className="row-actions">
              <button className="button primary" onClick={() => setInvite(true)}>
                {isAdmin ? 'Crear cuenta' : 'Crear cuenta de enfermería'}
              </button>
            </div>
          </div>
          <p className="hint">
            Cada persona debe usar su propia cuenta. Desactivar un perfil bloquea las operaciones y
            lecturas protegidas en la base de datos.
          </p>
          {data.staff
            .filter((s) => isAdmin || s.role !== 'admin')
            .map((s) => (
              <div className="child-row" key={s.id}>
                <span className="avatar">{s.full_name[0]}</span>
                <div className="grow">
                  <strong>{s.full_name}</strong>
                  <p className="small muted">
                    {roleLabels[s.role]} · {s.active ? 'Activo' : 'Inactivo'}
                  </p>
                  <p className="small muted">
                    Usuario: <strong>{s.username}</strong>
                  </p>
                </div>
                {canManageProfile(profile.role, s) && (
                  <div className="row-actions">
                    <button
                      className="button"
                      onClick={() => setEdit(s)}
                      aria-label={`Gestionar perfil de ${s.full_name}`}
                    >
                      Gestionar perfil
                    </button>
                    {s.id !== profile.id && (
                      <button
                        className="button"
                        onClick={() => setReset(s)}
                        aria-label={`Restablecer contraseña de ${s.full_name}`}
                      >
                        Restablecer contraseña
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
        </section>
      )}
      {isAdmin && tab === 'Auditoría' && (
        <section className="surface">
          <h2>Últimos 200 eventos</h2>
          <p className="hint">
            Autor, fecha, operación y entidad. Los valores anteriores y nuevos se conservan en la
            base de datos.
          </p>
          {error && (
            <p className="error-notice" role="alert">
              {error}
            </p>
          )}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Responsable</th>
                  <th>Operación</th>
                  <th>Entidad</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td>
                      {showDate(a.occurred_at)}
                      <br />
                      {new Date(a.occurred_at).toLocaleTimeString('es-PE', {
                        timeZone: 'America/Lima',
                      })}
                    </td>
                    <td>
                      {data.staff.find((s) => s.id === a.actor_id)?.full_name ||
                        'Administración técnica'}
                    </td>
                    <td>{a.action}</td>
                    <td>
                      {a.entity}
                      <br />
                      <span className="small muted">{a.entity_id}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {edit && (
        <Modal
          title="Gestionar perfil de acceso"
          onClose={() => {
            setEdit(undefined);
          }}
        >
          <Form
            action="save_staff"
            onSuccess={() => {
              setEdit(undefined);
            }}
            payload={(f) => ({
              ...Object.fromEntries(f),
              username: text(f, 'username').toLowerCase(),
              active: f.get('active') === 'on',
            })}
          >
            <input type="hidden" name="id" value={edit.id} />
            <Field label="Usuario">
              <input
                name="username"
                defaultValue={edit.username}
                required
                minLength={3}
                maxLength={24}
                pattern="[A-Za-z][A-Za-z0-9._-]{2,23}"
                autoCapitalize="none"
                spellCheck={false}
              />
            </Field>
            <div className="full">
              <Field label="Nombre completo">
                <input
                  name="full_name"
                  defaultValue={edit?.full_name}
                  required
                  minLength={3}
                  maxLength={120}
                />
              </Field>
            </div>
            <Field label="Rol">
              <select name="role" defaultValue={edit?.role || 'nurse'}>
                {assignableRoles(profile.role).map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
            </Field>
            <label className="inline-check">
              <input name="active" type="checkbox" defaultChecked={edit?.active ?? true} />
              Acceso activo
            </label>
            <p className="hint full">
              Desactivar el acceso conserva los registros de la persona. Cambiar el usuario no
              cambia su contraseña.
              {isAdmin && ' No es posible desactivar al último administrador activo.'}
            </p>
          </Form>
        </Modal>
      )}
      {isAdmin && closed && (
        <Modal title="Registrar día cerrado" onClose={() => setClosed(false)}>
          <Form
            action="closed_day"
            onSuccess={() => setClosed(false)}
            payload={(f) => ({ date: text(f, 'date'), reason: text(f, 'reason') })}
          >
            <Field label="Fecha">
              <DateInput name="date" min={todayLima()} required />
            </Field>
            <Field label="Motivo">
              <input name="reason" required minLength={3} maxLength={300} />
            </Field>
            <p className="hint full">
              Primero deben reprogramarse los controles pendientes de ese día.
            </p>
          </Form>
        </Modal>
      )}
      {invite && <CreateStaff role={profile.role} onClose={() => setInvite(false)} />}
      {reset && (
        <CreateStaff role={profile.role} target={reset} onClose={() => setReset(undefined)} />
      )}
    </>
  );
}
function CreateStaff({
  onClose,
  role,
  target,
}: {
  onClose: () => void;
  role: StaffRole;
  target?: Staff;
}) {
  const { refresh, notify } = useData(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <Modal
      title={target ? 'Restablecer contraseña' : 'Crear cuenta del equipo'}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          const f = new FormData(e.currentTarget);
          setBusy(true);
          setError('');
          try {
            const { error } = await db().functions.invoke('invite-staff', {
              body: target
                ? { action: 'reset_password', id: target.id, password: f.get('password') }
                : Object.fromEntries(f),
            });
            if (error) {
              const response = (error as { context?: Response }).context;
              if (response && typeof response.json === 'function') {
                const detail = await response.json().catch(() => null);
                if (typeof detail?.error === 'string') throw new Error(detail.error);
              }
              throw new Error(
                'No se pudo crear la cuenta. Verifica el despliegue de invite-staff y APP_ORIGIN en Supabase.',
              );
            }
            await refresh();
            notify(
              target
                ? `Contraseña restablecida para ${target.username}. Entrega la nueva clave a su titular.`
                : `Cuenta creada para ${f.get('username')}. Ya puede ingresar y cambiar su contraseña.`,
            );
            onClose();
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'No se pudo crear la cuenta.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset className="form-fields" disabled={busy}>
          {target ? (
            <div className="full">
              <strong>{target.full_name}</strong>
              <p>Usuario: {target.username}</p>
              <p>Confirma la identidad de la persona antes de entregar la nueva clave.</p>
            </div>
          ) : (
            <>
              <div className="full">
                <Field label="Nombre completo">
                  <input name="full_name" required minLength={3} maxLength={120} />
                </Field>
              </div>
              <Field label="Usuario">
                <input
                  name="username"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  minLength={3}
                  maxLength={24}
                  pattern="[A-Za-z][A-Za-z0-9._-]{2,23}"
                  placeholder="Ejemplo: ana.perez"
                />
              </Field>
              <Field label="Rol">
                <select name="role">
                  {assignableRoles(role).map((value) => (
                    <option key={value} value={value}>
                      {roleLabels[value]}
                    </option>
                  ))}
                </select>
              </Field>
              <p className="hint full">
                Elige un usuario único de 3 a 24 caracteres, sin espacios ni tildes. Empieza con una
                letra.
              </p>
            </>
          )}
          <div className="full">
            <Field label={target ? 'Nueva contraseña' : 'Contraseña inicial'}>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                maxLength={128}
                required
              />
            </Field>
          </div>
          <p className="hint full">
            Usa al menos 6 caracteres. Entrega la clave a su titular; podrá cambiarla desde su
            sesión.
          </p>
        </fieldset>
        {error && (
          <p className="error-notice full" role="alert">
            {error}
          </p>
        )}
        <div className="form-footer">
          <p className="hint">Cada integrante tendrá su propia cuenta.</p>
          <button className="button primary" disabled={busy}>
            {busy ? 'Guardando…' : target ? 'Guardar nueva contraseña' : 'Crear cuenta'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
