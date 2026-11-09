import { DateInput } from '../../shared/ui/DateInput';
import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useData, getRows, messageFor } from '../../shared/lib/data';
import { showDate, todayLima } from '../../shared/lib/dates';
import type { Contact, Followup, Staff } from '../../shared/types';
import { Modal } from '../../shared/ui/Modal';
import { Field, Form, Status, text } from '../../shared/ui/Forms';
export function CreateFollowup({ childId, onClose }: { childId?: string; onClose: () => void }) {
  const { children, staff } = useData(),
    profile = useOutletContext<Staff>();
  return (
    <Modal title="Crear seguimiento" onClose={onClose}>
      <Form
        action="create_followup"
        onSuccess={onClose}
        payload={(f) => ({ ...Object.fromEntries(f), next_date: text(f, 'next_date') || null })}
      >
        <div className="full">
          <Field label="Niño o niña">
            <select name="child_id" defaultValue={childId} required>
              <option value="">Seleccionar</option>
              {children
                .filter((c) => !c.archived)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} · {c.document_number}
                  </option>
                ))}
            </select>
          </Field>
        </div>
        <div className="full">
          <Field label="Motivo">
            <input name="reason" required minLength={3} maxLength={1000} />
          </Field>
        </div>
        <Field label="Responsable">
          <select
            name="assigned_to"
            defaultValue={profile.role === 'nurse' && profile.active ? profile.id : ''}
            required
          >
            <option value="" disabled>
              Seleccionar enfermera
            </option>
            {staff
              .filter((s) => s.active && s.role === 'nurse')
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Próxima fecha (opcional)">
          <DateInput name="next_date" min={todayLima()} />
        </Field>
        <div className="full">
          <Field label="Próxima acción">
            <input name="next_action" maxLength={1000} />
          </Field>
        </div>
      </Form>
    </Modal>
  );
}
export default function FollowupPage() {
  const { followups, children, staff } = useData(),
    [filter, setFilter] = useState('pending'),
    [responsible, setResponsible] = useState(''),
    [create, setCreate] = useState(false),
    [selected, setSelected] = useState<Followup>(),
    [resolving, setResolving] = useState<Followup>();
  const [contacts, setContacts] = useState<Contact[]>([]),
    [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    void getRows<Contact>('followup_contacts')
      .then((rows) => {
        if (alive) {
          setContacts(rows);
          setError('');
        }
      })
      .catch((e) => {
        if (alive) setError(messageFor(e));
      });
    return () => {
      alive = false;
    };
  }, [followups]);
  const tasks = followups
    .filter(
      (t) =>
        (filter === 'all' ||
          (filter === 'resolved' ? t.status === 'resolved' : t.status !== 'resolved')) &&
        (!responsible || t.assigned_to === responsible),
    )
    .sort((a, b) => (a.next_date || '9999').localeCompare(b.next_date || '9999'));
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="overline">CONTINUIDAD DEL CUIDADO</p>
          <h1>Que nadie quede pendiente.</h1>
          <p>Contactos, inasistencias y próximas acciones del equipo.</p>
        </div>
        <button className="button primary" onClick={() => setCreate(true)}>
          + Crear seguimiento
        </button>
      </div>
      <div className="filter-bar">
        <Field label="Estado">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="pending">Pendientes</option>
            <option value="resolved">Resueltos</option>
            <option value="all">Todos</option>
          </select>
        </Field>
        <Field label="Responsable">
          <select value={responsible} onChange={(e) => setResponsible(e.target.value)}>
            <option value="">Todo el equipo</option>
            {staff
              .filter((s) => s.role === 'nurse')
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
          </select>
        </Field>
      </div>
      {error && (
        <div role="alert" className="error-notice">
          {error}
        </div>
      )}
      <div className="stack">
        {tasks.map((t) => {
          const c = children.find((c) => c.id === t.child_id);
          return (
            <article className="surface" key={t.id}>
              <div className="section-heading">
                <div>
                  <Status value={t.status} />
                  <h2 style={{ marginTop: 10 }}>
                    <Link to={`/ninos/${t.child_id}`}>{c?.full_name}</Link>
                  </h2>
                  <p className="muted">{t.reason}</p>
                </div>
                {t.status !== 'resolved' && (
                  <button className="button primary" onClick={() => setSelected(t)}>
                    Registrar contacto
                  </button>
                )}
              </div>
              <div className="contact-details">
                <p>
                  <strong>Cuidador:</strong> {c?.guardian_name} · {c?.phone}
                </p>
                <p>
                  <strong>Dirección:</strong> {c?.address}
                </p>
                <p>
                  <strong>Responsable:</strong>{' '}
                  {staff.find((s) => s.id === t.assigned_to)?.full_name}
                </p>
              </div>
              <div className="rule-notice">
                <strong>{t.status === 'resolved' ? 'Resolución' : 'Próxima acción'}</strong>
                <p>
                  {t.status === 'resolved'
                    ? t.resolution
                    : `${t.next_action || 'Por definir'}${t.next_date ? ' · ' + showDate(t.next_date) : ''}`}
                </p>
              </div>
              <details>
                <summary>
                  Historial de contactos ({contacts.filter((c) => c.followup_id === t.id).length})
                </summary>
                {contacts
                  .filter((c) => c.followup_id === t.id)
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .map((c) => (
                    <div className="mini-record" key={c.id}>
                      <strong>
                        {showDate(c.created_at)} ·{' '}
                        {c.channel === 'call'
                          ? 'Llamada'
                          : c.channel === 'home_visit'
                            ? 'Visita domiciliaria'
                            : 'Otro'}
                      </strong>
                      <p>
                        {c.result === 'contacted'
                          ? 'Contactado'
                          : c.result === 'no_answer'
                            ? 'Sin respuesta'
                            : 'Datos por corregir'}{' '}
                        · {c.notes}
                      </p>
                      <small>{staff.find((s) => s.id === c.created_by)?.full_name}</small>
                    </div>
                  ))}
              </details>
              {t.status !== 'resolved' && (
                <div className="row-actions">
                  <Link className="button" to={`/ninos/${t.child_id}`}>
                    Abrir ficha y programar
                  </Link>
                  <button className="text-button" onClick={() => setResolving(t)}>
                    Resolver seguimiento
                  </button>
                </div>
              )}
            </article>
          );
        })}
        {!tasks.length && (
          <div className="empty-state">No hay seguimientos para estos filtros.</div>
        )}
      </div>
      {create && <CreateFollowup onClose={() => setCreate(false)} />}
      {selected && (
        <Modal title="Registrar llamada o visita" onClose={() => setSelected(undefined)}>
          <Form
            action="contact"
            onSuccess={() => setSelected(undefined)}
            payload={(f) => ({
              ...Object.fromEntries(f),
              id: selected.id,
              revision: selected.revision,
              next_date: text(f, 'next_date') || null,
            })}
          >
            <Field label="Medio">
              <select name="channel">
                <option value="call">Llamada</option>
                <option value="home_visit">Visita domiciliaria</option>
                <option value="other">Otro</option>
              </select>
            </Field>
            <Field label="Resultado">
              <select name="result">
                <option value="contacted">Contactado</option>
                <option value="no_answer">Sin respuesta</option>
                <option value="invalid_contact">Datos por corregir</option>
              </select>
            </Field>
            <div className="full">
              <Field label="Detalle del contacto">
                <textarea name="notes" required minLength={3} maxLength={2000} rows={3} />
              </Field>
            </div>
            <Field label="Próxima acción">
              <input
                name="next_action"
                defaultValue={selected.next_action}
                required
                maxLength={1000}
              />
            </Field>
            <Field label="Próxima fecha">
              <DateInput
                name="next_date"
                min={todayLima()}
                defaultValue={selected.next_date || ''}
              />
            </Field>
          </Form>
        </Modal>
      )}
      {resolving && (
        <Modal title="Resolver seguimiento" onClose={() => setResolving(undefined)}>
          <Form
            action="resolve_followup"
            onSuccess={() => setResolving(undefined)}
            payload={(f) => ({
              id: resolving.id,
              revision: resolving.revision,
              resolution: text(f, 'resolution'),
            })}
          >
            <div className="full">
              <Field label="Cómo se resolvió y motivo de cierre">
                <textarea name="resolution" required minLength={5} maxLength={1000} rows={3} />
              </Field>
            </div>
            <p className="hint full">
              Contactar o reprogramar no equivale a una atención realizada. El cierre no modificará
              controles ni vacunas.
            </p>
          </Form>
        </Modal>
      )}
    </>
  );
}
