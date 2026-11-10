import { roomLabel } from '../../shared/lib/rooms';
import { DateInput } from '../../shared/ui/DateInput';
import { useState } from 'react';
import { useData } from '../../shared/lib/data';
import { Modal } from '../../shared/ui/Modal';
import { Field, Form, text } from '../../shared/ui/Forms';
import {
  addDays,
  limaInstant,
  overlaps,
  suggestControl,
  timeOnly,
  todayLima,
  showDate,
} from '../../shared/lib/dates';
import type { Appointment } from '../../shared/types';
export function AppointmentForm({
  childId,
  previous,
  initialDate,
  onClose,
}: {
  childId?: string;
  previous?: Appointment;
  initialDate?: string;
  onClose: () => void;
}) {
  const { children, staff, settings, appointments, encounters, closedDays } = useData();
  const [selectedChild, setChild] = useState(previous?.child_id || childId || ''),
    [date, setDate] = useState(
      initialDate && initialDate >= todayLima() ? initialDate : todayLima(),
    );
  const [time, setTime] = useState(
    previous ? timeOnly(previous.starts_at) : settings?.opens_at.slice(0, 5) || '08:00',
  );
  const [duration, setDuration] = useState(settings?.slot_minutes || 30),
    [nurse, setNurse] = useState(previous?.nurse_id || ''),
    [room, setRoom] = useState(String(previous?.room || 1));
  const c = children.find((c) => c.id === selectedChild);
  const last = encounters
    .filter((e) => e.child_id === selectedChild && e.status === 'final')
    .map((e) => e.performed_on)
    .sort()
    .at(-1);
  const suggestion = c
    ? suggestControl(c.birth_date, last || null, settings?.rules_approved || false)
    : null;
  const candidate = {
    starts_at: limaInstant(date, time),
    ends_at: new Date(Date.parse(limaInstant(date, time)) + duration * 60000).toISOString(),
  };
  const conflict = appointments.some(
    (a) =>
      a.id !== previous?.id &&
      ['scheduled', 'arrived', 'in_progress', 'completed'].includes(a.status) &&
      (a.nurse_id === nurse || String(a.room) === room || a.child_id === selectedChild) &&
      overlaps(a, candidate),
  );
  const closed = closedDays.find((d) => d.date === date);
  return (
    <Modal title={previous ? 'Reprogramar control' : 'Programar control CRED'} onClose={onClose}>
      <Form
        action={previous ? 'reschedule' : 'book'}
        onSuccess={onClose}
        submitLabel="Confirmar programación"
        payload={(f) => ({
          child_id: selectedChild,
          nurse_id: nurse,
          ...candidate,
          room: Number(room),
          reason: text(f, 'reason'),
          ...(previous ? { previous_id: previous.id, revision: previous.revision } : {}),
        })}
      >
        <div className="full">
          <Field label="Niño o niña">
            <select
              name="child_id"
              value={selectedChild}
              disabled={!!previous}
              onChange={(e) => setChild(e.target.value)}
              required
            >
              <option value="">Seleccionar niño</option>
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
        {suggestion && (
          <div className="rule-notice full">
            <strong>
              {suggestion.date
                ? `Fecha orientativa: ${showDate(suggestion.date)}`
                : 'Programación con revisión profesional'}
            </strong>
            <p>{suggestion.reason}</p>
            {suggestion.date && (
              <button
                type="button"
                className="button"
                onClick={() =>
                  setDate(suggestion.date! < todayLima() ? todayLima() : suggestion.date!)
                }
              >
                Usar propuesta y revisar disponibilidad
              </button>
            )}
          </div>
        )}
        <Field label="Fecha">
          <DateInput
            value={date}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
            }}
            min={todayLima()}
            max={addDays(todayLima(), 730)}
            required
          />
        </Field>
        <Field label="Hora de inicio">
          <input
            type="time"
            value={time}
            onChange={(e) => {
              if (e.target.value) setTime(e.target.value);
            }}
            required
          />
        </Field>
        <Field label="Duración (minutos)">
          <input
            type="number"
            value={duration}
            min={15}
            max={120}
            step={5}
            onChange={(e) => setDuration(Number(e.target.value) || 15)}
            required
          />
        </Field>
        <Field label="Consultorio">
          <select value={room} onChange={(e) => setRoom(e.target.value)}>
            {Array.from({ length: settings?.room_count || 1 }, (_, i) => (
              <option key={i} value={i + 1}>
                {roomLabel(i + 1, settings)}
              </option>
            ))}
          </select>
        </Field>
        <div className="full">
          <Field label="Enfermera responsable">
            <select value={nurse} onChange={(e) => setNurse(e.target.value)} required>
              <option value="">Seleccionar enfermera</option>
              {staff
                .filter((s) => s.active && s.role === 'nurse')
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
            </select>
          </Field>
        </div>
        <div className="full">
          <Field
            label={previous ? 'Motivo de reprogramación' : 'Observación de programación (opcional)'}
          >
            <textarea
              name="reason"
              rows={2}
              minLength={previous ? 5 : undefined}
              maxLength={1000}
              required={!!previous}
            />
          </Field>
        </div>
        {(closed || conflict) && (
          <p role="status" className="error-notice full">
            {closed
              ? `Día cerrado: ${closed.reason}`
              : 'Hay un cruce de horario. Ajusta hora, enfermera o consultorio.'}
          </p>
        )}
        <label className="inline-check full">
          <input type="checkbox" required />
          Confirmé antecedentes, intervalo y condiciones del control.
        </label>
        <p className="hint full">
          La propuesta no crea controles automáticamente ni sustituye la validación de enfermería.
          La base de datos verifica disponibilidad al guardar.
        </p>
      </Form>
    </Modal>
  );
}
