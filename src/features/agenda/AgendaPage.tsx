import { roomLabel } from '../../shared/lib/rooms';
import { DateInput } from '../../shared/ui/DateInput';
import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { CalendarDays, Plus, Printer } from 'lucide-react';
import { useData } from '../../shared/lib/data';
import { addDays, dateOnly, showDate, timeOnly, todayLima } from '../../shared/lib/dates';
import { Status, Form, Field, text } from '../../shared/ui/Forms';
import { Modal } from '../../shared/ui/Modal';
import type { Appointment, Staff } from '../../shared/types';
import { AppointmentForm } from './AppointmentForm';
import { EncounterForm } from './EncounterForm';

export default function AgendaPage() {
  const data = useData(),
    profile = useOutletContext<Staff>();
  const [date, setDate] = useState(todayLima()),
    [nurse, setNurse] = useState(''),
    [mode, setMode] = useState<'day' | 'week'>('day');
  const [book, setBook] = useState(false),
    [previous, setPrevious] = useState<Appointment>(),
    [encounter, setEncounter] = useState<Appointment>(),
    [statusChange, setStatusChange] = useState<{ a: Appointment; status: string }>();
  const weekStart = addDays(date, -((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7));
  const matches = data.appointments.filter((a) => !nurse || a.nurse_id === nurse);
  const day = matches.filter((a) => dateOnly(a.starts_at) === date && a.status !== 'rescheduled');
  const list = matches
    .filter((a) =>
      mode === 'day'
        ? dateOnly(a.starts_at) === date
        : dateOnly(a.starts_at) >= weekStart && dateOnly(a.starts_at) <= addDays(weekStart, 6),
    )
    .filter((a) => a.status !== 'rescheduled')
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const pending = data.followups.filter((t) => t.status !== 'resolved');
  return (
    <>
      <div className="page-heading no-print">
        <div>
          <p className="overline">ORGANIZA TU JORNADA</p>
          <h1>Tu agenda, en orden.</h1>
          <p>{showDate(date)} · Equipo de enfermería</p>
        </div>
        <button className="button primary" onClick={() => setBook(true)}>
          <Plus size={17} />
          Programar control
        </button>
      </div>
      <div className="stats-grid no-print">
        {[
          ['Programaciones', day.filter((a) => a.status !== 'cancelled').length],
          [
            'Por atender',
            day.filter((a) => ['scheduled', 'arrived', 'in_progress'].includes(a.status)).length,
          ],
          ['Atendidas', day.filter((a) => a.status === 'completed').length],
          ['No asistieron', day.filter((a) => a.status === 'no_show').length],
        ].map(([label, count]) => (
          <div className="stat-card" key={label}>
            <span>{label}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
      <div className="agenda-layout">
        <section className="surface agenda-surface">
          <div className="section-heading">
            <h2>
              <CalendarDays size={19} />
              Controles programados
            </h2>
            <button className="button no-print" onClick={() => window.print()}>
              <Printer size={16} />
              Imprimir lista
            </button>
          </div>
          <div className="filter-bar no-print">
            <Field label="Fecha">
              <DateInput
                value={date}
                onChange={(e) => {
                  if (e.target.value) setDate(e.target.value);
                }}
              />
            </Field>
            <button className="button" onClick={() => setDate(todayLima())}>
              Hoy
            </button>
            <Field label="Enfermera">
              <select value={nurse} onChange={(e) => setNurse(e.target.value)}>
                <option value="">Todo el equipo</option>
                {data.staff
                  .filter((s) => s.role === 'nurse')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
              </select>
            </Field>
            <div className="segmented">
              <button aria-pressed={mode === 'day'} onClick={() => setMode('day')}>
                Día
              </button>
              <button aria-pressed={mode === 'week'} onClick={() => setMode('week')}>
                Semana
              </button>
            </div>
          </div>
          <div className="week-strip no-print">
            {Array.from({ length: 7 }, (_, i) => {
              const d = addDays(weekStart, i);
              return (
                <button key={d} aria-pressed={d === date} onClick={() => setDate(d)}>
                  <span>{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][i]}</span>
                  <strong>{Number(d.slice(-2))}</strong>
                  <span>
                    {
                      matches.filter(
                        (a) =>
                          dateOnly(a.starts_at) === d &&
                          !['cancelled', 'rescheduled'].includes(a.status),
                      ).length
                    }
                  </span>
                </button>
              );
            })}
          </div>
          <div className="print-title">
            <h1>CSMI El Milagro · Agenda CRED</h1>
            <p>
              IPRESS 00005222 ·{' '}
              {mode === 'day'
                ? showDate(date)
                : `${showDate(weekStart)} a ${showDate(addDays(weekStart, 6))}`}
            </p>
          </div>
          {list.map((a) => {
            const c = data.children.find((c) => c.id === a.child_id);
            return (
              <article key={a.id} className="appointment-row">
                <div className="appointment-time">
                  {mode === 'week' && <small>{showDate(dateOnly(a.starts_at))}</small>}
                  <strong>{timeOnly(a.starts_at)}</strong>
                  <span>{timeOnly(a.ends_at)}</span>
                </div>
                <div className="grow">
                  <Link className="record-title" to={`/ninos/${a.child_id}`}>
                    {c?.full_name || 'Ficha no disponible'}
                  </Link>
                  <p className="small muted">
                    {c?.document_number} · {roomLabel(a.room, data.settings)}
                  </p>
                  <p className="small muted">
                    {data.staff.find((s) => s.id === a.nurse_id)?.full_name}
                  </p>
                  <Status value={a.status} />
                  <div className="row-actions no-print">
                    {a.status === 'scheduled' && (
                      <>
                        <button
                          className="button small-button"
                          onClick={() => setStatusChange({ a, status: 'arrived' })}
                        >
                          Registrar llegada
                        </button>
                        <button
                          className="text-button"
                          onClick={() => setStatusChange({ a, status: 'no_show' })}
                        >
                          No asistió
                        </button>
                      </>
                    )}
                    {['arrived', 'in_progress'].includes(a.status) && a.nurse_id === profile.id && (
                      <button
                        className="button primary small-button"
                        onClick={() => setEncounter(a)}
                      >
                        Registrar control
                      </button>
                    )}
                    {['scheduled', 'arrived', 'no_show'].includes(a.status) && (
                      <button className="text-button" onClick={() => setPrevious(a)}>
                        Reprogramar
                      </button>
                    )}
                    {['scheduled', 'arrived'].includes(a.status) && (
                      <button
                        className="text-button"
                        onClick={() => setStatusChange({ a, status: 'cancelled' })}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
          {!list.length && (
            <div className="empty-state">
              <CalendarDays size={30} />
              <h3>Sin controles programados</h3>
              <p>Elige otro día o programa un control.</p>
            </div>
          )}
        </section>
        <aside className="agenda-aside no-print">
          <div className="surface">
            <h2>
              Por recuperar <span className="status status-no_show">{pending.length}</span>
            </h2>
            {pending.slice(0, 3).map((t) => (
              <div key={t.id} className="mini-record">
                <strong>{data.children.find((c) => c.id === t.child_id)?.full_name}</strong>
                <p>{t.reason}</p>
              </div>
            ))}
            {!pending.length && <p className="hint">Sin seguimientos pendientes.</p>}
            <Link className="text-link" to="/seguimiento">
              Ver seguimiento →
            </Link>
          </div>
          <div className="surface">
            <h2>Próximos 7 días</h2>
            {matches
              .filter(
                (a) =>
                  a.status === 'scheduled' &&
                  dateOnly(a.starts_at) > date &&
                  dateOnly(a.starts_at) <= addDays(date, 7),
              )
              .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
              .slice(0, 4)
              .map((a) => (
                <div className="mini-record" key={a.id}>
                  <strong>{data.children.find((c) => c.id === a.child_id)?.full_name}</strong>
                  <p>
                    {showDate(dateOnly(a.starts_at))} · {timeOnly(a.starts_at)}
                  </p>
                </div>
              ))}
            <p className="hint">Las fechas orientativas se confirman antes de reservar horario.</p>
          </div>
        </aside>
      </div>
      {(book || previous) && (
        <AppointmentForm
          initialDate={date}
          previous={previous}
          onClose={() => {
            setBook(false);
            setPrevious(undefined);
          }}
        />
      )}
      {encounter && (
        <EncounterForm appointment={encounter} onClose={() => setEncounter(undefined)} />
      )}
      {statusChange && (
        <Modal
          title={
            statusChange.status === 'no_show'
              ? 'Confirmar inasistencia'
              : statusChange.status === 'cancelled'
                ? 'Cancelar programación'
                : 'Registrar llegada'
          }
          onClose={() => setStatusChange(undefined)}
        >
          <Form
            action="appointment_status"
            onSuccess={() => setStatusChange(undefined)}
            payload={(f) => ({
              id: statusChange.a.id,
              revision: statusChange.a.revision,
              status: statusChange.status,
              reason: text(f, 'reason'),
            })}
            submitLabel="Confirmar"
          >
            <p className="hint full">
              {statusChange.status === 'no_show'
                ? 'Se creará un seguimiento para contactar al cuidador. No se registrará una atención.'
                : 'La acción quedará registrada con tu usuario.'}
            </p>
            {statusChange.status === 'cancelled' && (
              <div className="full">
                <Field label="Motivo de cancelación">
                  <textarea name="reason" required minLength={5} maxLength={1000} />
                </Field>
              </div>
            )}
          </Form>
        </Modal>
      )}
    </>
  );
}
