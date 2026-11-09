import { roomLabel } from '../../shared/lib/rooms';
import { DateInput } from '../../shared/ui/DateInput';
import { useEffect, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { useData, getRows, messageFor } from '../../shared/lib/data';
import {
  ageLabel,
  dateOnly,
  showDate,
  suggestControl,
  timeOnly,
  todayLima,
} from '../../shared/lib/dates';
import type { Correction, Encounter, Staff, Vaccine } from '../../shared/types';
import { Status, Field, Form, text } from '../../shared/ui/Forms';
import { Modal } from '../../shared/ui/Modal';
import { AppointmentForm } from '../agenda/AppointmentForm';
import { ChildForm } from './ChildForm';
import { CreateFollowup } from '../followup/FollowupPage';

export default function ChildProfilePage() {
  const { id } = useParams(),
    data = useData(),
    profile = useOutletContext<Staff>();
  const child = data.children.find((c) => c.id === id);
  const [tab, setTab] = useState('Resumen'),
    [modal, setModal] = useState('');
  const [vaccines, setVaccines] = useState<Vaccine[]>([]),
    [corrections, setCorrections] = useState<Correction[]>([]),
    [loadError, setLoadError] = useState(''),
    [revision, setRevision] = useState(0),
    [correcting, setCorrecting] = useState<Encounter>(),
    [vaccine, setVaccine] = useState<Vaccine>();
  useEffect(() => {
    let active = true;
    if (id)
      void Promise.all([
        getRows<Vaccine>('vaccine_records', { child_id: id }),
        getRows<Correction>('encounter_corrections'),
      ])
        .then(([v, c]) => {
          if (active) {
            setVaccines(v);
            setCorrections(c);
            setLoadError('');
          }
        })
        .catch((e) => {
          if (active) setLoadError(messageFor(e));
        });
    return () => {
      active = false;
    };
  }, [id, revision, data.version]);
  if (!child)
    return (
      <div className="empty-state">
        <h1>Ficha no encontrada</h1>
        <Link to="/ninos">Volver al padrón</Link>
      </div>
    );
  const appointments = data.appointments
    .filter((a) => a.child_id === id)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const encounters = data.encounters.filter((e) => e.child_id === id),
    last = encounters
      .filter((e) => e.status === 'final')
      .map((e) => e.performed_on)
      .sort()
      .at(-1);
  const next = appointments
    .filter((a) => a.status === 'scheduled' && dateOnly(a.starts_at) >= todayLima())
    .at(-1);
  const suggestion = suggestControl(
    child.birth_date,
    last ? dateOnly(last) : null,
    data.settings?.rules_approved || false,
  );
  const done = () => {
    setModal('');
    setVaccine(undefined);
    setCorrecting(undefined);
    setRevision((r) => r + 1);
  };
  return (
    <>
      <Link to="/ninos" className="text-link">
        ← Volver al padrón
      </Link>
      <div className="page-heading profile-heading">
        <div>
          <p className="overline">FICHA DE SEGUIMIENTO</p>
          <h1>{child.full_name}</h1>
          <p>
            {child.document_type} {child.document_number} · {ageLabel(child.birth_date)} · Nació el{' '}
            {showDate(child.birth_date)} {child.archived && '· Archivado'}
          </p>
        </div>
        <div className="row-actions">
          <button className="button" onClick={() => setModal('edit')}>
            Editar ficha
          </button>
          {!child.archived && (
            <button className="button primary" onClick={() => setModal('book')}>
              Programar control
            </button>
          )}
        </div>
      </div>
      <nav className="content-tabs" aria-label="Secciones de la ficha">
        {['Resumen', 'Historial', 'Cronograma', 'Vacunas'].map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      {loadError && (
        <div className="error-notice" role="alert">
          {loadError}
          <button className="button" onClick={() => setRevision((r) => r + 1)}>
            Reintentar
          </button>
        </div>
      )}
      {tab === 'Resumen' && (
        <div className="two-columns">
          <section className="surface">
            <h2>Cuidador y contacto</h2>
            <dl className="details">
              <dt>Cuidador</dt>
              <dd>
                {child.guardian_name} · {child.guardian_relationship}
              </dd>
              <dt>Teléfono</dt>
              <dd>{child.phone}</dd>
              <dt>Dirección</dt>
              <dd>{child.address}</dd>
              <dt>Historia clínica</dt>
              <dd>{child.history_number || 'No registrada'}</dd>
            </dl>
            {child.notes && <p className="hint">{child.notes}</p>}
            <button className="button" onClick={() => setModal('follow')}>
              Crear seguimiento
            </button>
          </section>
          <section className="surface">
            <h2>Continuidad del cuidado</h2>
            <div className="mini-record">
              <strong>Último control realizado</strong>
              <p>{last ? showDate(dateOnly(last)) : 'Sin antecedente registrado'}</p>
            </div>
            <div className="mini-record">
              <strong>Próxima programación confirmada</strong>
              <p>
                {next
                  ? `${showDate(dateOnly(next.starts_at))} · ${timeOnly(next.starts_at)}`
                  : 'Sin horario reservado'}
              </p>
            </div>
            <div className="mini-record">
              <strong>Seguimientos pendientes</strong>
              <p>
                {data.followups.filter((f) => f.child_id === id && f.status !== 'resolved').length}
              </p>
            </div>
            {profile.role === 'admin' && (
              <button className="text-button" onClick={() => setModal('archive')}>
                {child.archived ? 'Reactivar ficha' : 'Archivar ficha'}
              </button>
            )}
          </section>
        </div>
      )}
      {tab === 'Historial' && (
        <div className="surface">
          <h2>Programaciones y controles</h2>
          {appointments.map((a) => {
            const e = encounters.find((e) => e.appointment_id === a.id);
            return (
              <article className="history-record" key={a.id}>
                <div className="section-heading">
                  <h3>
                    {showDate(dateOnly(a.starts_at))} · {timeOnly(a.starts_at)}
                  </h3>
                  <Status value={a.status} />
                </div>
                <p className="small muted">
                  {data.staff.find((s) => s.id === a.nurse_id)?.full_name} ·{' '}
                  {roomLabel(a.room, data.settings)}
                </p>
                {a.reason && <p className="hint">{a.reason}</p>}
                {e && (
                  <div className="record-content">
                    <Status value={e.status} />
                    <dl className="details">
                      <dt>Fecha real del control</dt>
                      <dd>{showDate(e.performed_on)}</dd>
                      <dt>Resultado</dt>
                      <dd>{e.observations || 'En elaboración'}</dd>
                      <dt>Acuerdos</dt>
                      <dd>{e.agreements || 'Sin acuerdos registrados'}</dd>
                      <dt>Pendientes</dt>
                      <dd>{e.pending || 'Sin pendientes registrados'}</dd>
                      <dt>Próxima fecha orientativa</dt>
                      <dd>{e.next_due_date ? showDate(e.next_due_date) : 'No indicada'}</dd>
                    </dl>
                    {corrections
                      .filter((c) => c.encounter_id === e.id)
                      .map((c) => (
                        <div className="rule-notice" key={c.id}>
                          <strong>Corrección añadida · {showDate(c.created_at)}</strong>
                          <p>Motivo: {c.reason}</p>
                          <p>{c.correction}</p>
                        </div>
                      ))}
                    {e.status === 'final' && e.nurse_id === profile.id && (
                      <button className="button" onClick={() => setCorrecting(e)}>
                        Añadir corrección
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
          {!appointments.length && (
            <div className="empty-state">No hay controles ni programaciones registradas.</div>
          )}
        </div>
      )}
      {tab === 'Cronograma' && (
        <div className="surface">
          <h2>Plan orientativo CRED</h2>
          <div className="rule-notice">
            <strong>
              {suggestion.date
                ? `Propuesta: ${showDate(suggestion.date)}`
                : 'Revisión de antecedentes requerida'}
            </strong>
            <p>{suggestion.reason}</p>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Grupo de edad</th>
                  <th>Frecuencia de referencia</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Recién nacido', '3 controles; revisar alta y ventanas'],
                  ['29 días a menos de 1 año', '7 controles: 1, 2, 3, 4, 6, 7 y 9 meses'],
                  ['1 año', '4 controles: 12, 15, 18 y 21 meses'],
                  ['2 a 4 años', '2 por año, semestrales'],
                  ['5 a 11 años', '1 por año'],
                ].map(([g, f]) => (
                  <tr key={g}>
                    <td>{g}</td>
                    <td>{f}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint">
            Versión: {data.settings?.rule_version} ·{' '}
            {data.settings?.rules_approved
              ? 'Habilitada por administración para revisión profesional'
              : 'Pendiente de validación local'}
            . No se generan atenciones retroactivas ni se completan controles por asistencia.
          </p>
          <button className="button primary" onClick={() => setModal('book')}>
            Elegir fecha y horario
          </button>
        </div>
      )}
      {tab === 'Vacunas' && (
        <div className="surface">
          <div className="section-heading">
            <h2>Antecedentes y revisión del carné</h2>
            <button className="button primary" onClick={() => setModal('vaccine')}>
              Registrar antecedente
            </button>
          </div>
          <p className="hint">
            No tener información registrada no significa «no vacunado». Aquí se documenta la fuente
            y el estado; no se prescribe un esquema automáticamente.
          </p>
          {vaccines
            .filter((v) => !vaccines.some((n) => n.supersedes_id === v.id))
            .map((v) => (
              <article className="history-record" key={v.id}>
                <div className="section-heading">
                  <h3>
                    {v.vaccine_name} · {v.dose}
                  </h3>
                  <Status value={v.status} />
                </div>
                <p>
                  {v.applied_on
                    ? `Fecha documentada: ${showDate(v.applied_on)}`
                    : 'Fecha de aplicación no documentada'}
                </p>
                <p className="small muted">
                  Fuente: {v.source} · Registró:{' '}
                  {data.staff.find((s) => s.id === v.created_by)?.full_name}
                </p>
                <p className="hint">{v.notes}</p>
                <button
                  className="text-button"
                  onClick={() => {
                    setVaccine(v);
                    setModal('vaccine');
                  }}
                >
                  Añadir actualización conservando el original
                </button>
              </article>
            ))}
          {!vaccines.length && (
            <div className="empty-state">Sin antecedentes vacunales documentados.</div>
          )}
          <details>
            <summary>Ver versiones anteriores</summary>
            {vaccines
              .filter((v) => vaccines.some((n) => n.supersedes_id === v.id))
              .map((v) => (
                <p className="hint" key={v.id}>
                  {v.vaccine_name} · {v.dose} · {v.source} · {v.notes}
                </p>
              ))}
          </details>
        </div>
      )}
      {modal === 'edit' && <ChildForm child={child} onClose={done} onSaved={done} />}
      {modal === 'book' && <AppointmentForm childId={child.id} onClose={done} />}
      {modal === 'follow' && <CreateFollowup childId={child.id} onClose={done} />}
      {modal === 'archive' && (
        <Modal title={child.archived ? 'Reactivar ficha' : 'Archivar ficha'} onClose={done}>
          <Form
            action="archive_child"
            onSuccess={done}
            payload={() => ({ id: child.id, revision: child.revision, archived: !child.archived })}
          >
            <p className="hint full">
              La ficha y su historial no se eliminan. Para archivar deben estar resueltas las
              programaciones pendientes.
            </p>
          </Form>
        </Modal>
      )}
      {correcting && (
        <Modal title="Añadir corrección al control" onClose={done}>
          <Form
            action="correct_encounter"
            onSuccess={done}
            payload={(f) => ({
              encounter_id: correcting.id,
              reason: text(f, 'reason'),
              correction: text(f, 'correction'),
            })}
          >
            <div className="full">
              <Field label="Motivo">
                <textarea name="reason" minLength={5} maxLength={2000} required />
              </Field>
            </div>
            <div className="full">
              <Field label="Corrección o aclaración">
                <textarea name="correction" minLength={5} maxLength={4000} required />
              </Field>
            </div>
            <p className="hint full">
              Se añadirá al historial sin modificar el contenido finalizado.
            </p>
          </Form>
        </Modal>
      )}
      {modal === 'vaccine' && (
        <Modal title="Documentar antecedente vacunal" onClose={done}>
          <Form
            action="save_vaccine"
            onSuccess={done}
            payload={(f) => ({
              ...Object.fromEntries(f),
              child_id: child.id,
              supersedes_id: vaccine?.id || null,
              applied_on: text(f, 'applied_on') || null,
            })}
          >
            <Field label="Vacuna / biológico">
              <input
                name="vaccine_name"
                defaultValue={vaccine?.vaccine_name}
                required
                minLength={2}
                maxLength={100}
              />
            </Field>
            <Field label="Dosis o refuerzo">
              <input name="dose" defaultValue={vaccine?.dose} required maxLength={50} />
            </Field>
            <Field label="Estado del antecedente">
              <select name="status" defaultValue={vaccine?.status || 'unverified'}>
                <option value="unverified">Información por verificar</option>
                <option value="pending">Pendiente documentado</option>
                <option value="documented">Aplicación documentada</option>
              </select>
            </Field>
            <Field label="Fecha de aplicación (si está documentada)">
              <DateInput
                name="applied_on"
                min={child.birth_date}
                max={todayLima()}
                defaultValue={vaccine?.applied_on || ''}
              />
            </Field>
            <div className="full">
              <Field label="Fuente del antecedente">
                <input
                  name="source"
                  defaultValue={vaccine?.source}
                  required
                  minLength={3}
                  maxLength={200}
                  placeholder="Carné físico, registro de vacunatorio…"
                />
              </Field>
            </div>
            <div className="full">
              <Field label="Observación o motivo de actualización">
                <textarea name="notes" defaultValue={vaccine?.notes} rows={2} maxLength={2000} />
              </Field>
            </div>
          </Form>
        </Modal>
      )}
    </>
  );
}
