import { DateInput } from '../../shared/ui/DateInput';
import { useState } from 'react';
import { useData } from '../../shared/lib/data';
import { Modal } from '../../shared/ui/Modal';
import { Field, Form, text } from '../../shared/ui/Forms';
import type { Appointment } from '../../shared/types';
import { dateOnly, todayLima } from '../../shared/lib/dates';
export function EncounterForm({
  appointment,
  onClose,
}: {
  appointment: Appointment;
  onClose: () => void;
}) {
  const { encounters, children } = useData();
  const [record] = useState(() => encounters.find((e) => e.appointment_id === appointment.id));
  const [performedOn, setPerformedOn] = useState(record?.performed_on || todayLima());
  return (
    <Modal
      title={`Control CRED · ${children.find((c) => c.id === appointment.child_id)?.full_name}`}
      onClose={onClose}
    >
      <Form
        action="save_encounter"
        onSuccess={onClose}
        payload={(f) => ({
          ...Object.fromEntries(f),
          appointment_id: appointment.id,
          revision: record?.revision || 0,
          next_due_date: text(f, 'next_due_date') || null,
        })}
      >
        <p className="hint full">
          Registro breve de apoyo. La evaluación clínica se documenta en los formatos
          institucionales. Solo la enfermera asignada puede guardar este control.
        </p>
        <div className="full">
          <Field label="Fecha real del control">
            <DateInput
              name="performed_on"
              value={performedOn}
              onChange={(e) => setPerformedOn(e.target.value)}
              min={dateOnly(appointment.starts_at)}
              max={todayLima()}
              required
            />
          </Field>
        </div>
        <div className="full">
          <Field label="Observaciones y resultado">
            <textarea
              name="observations"
              defaultValue={record?.observations}
              rows={3}
              minLength={5}
              maxLength={4000}
              required
            />
          </Field>
        </div>
        <div className="full">
          <Field label="Consejería y acuerdos">
            <textarea
              name="agreements"
              defaultValue={record?.agreements}
              rows={2}
              maxLength={4000}
            />
          </Field>
        </div>
        <div className="full">
          <Field label="Pendientes y derivaciones">
            <textarea name="pending" defaultValue={record?.pending} rows={2} maxLength={2000} />
          </Field>
        </div>
        <Field label="Próxima fecha orientativa (opcional)">
          <DateInput
            name="next_due_date"
            min={performedOn}
            defaultValue={record?.next_due_date || ''}
          />
        </Field>
        <Field label="Guardar como">
          <select name="status" defaultValue="draft">
            <option value="draft">Borrador · continuar después</option>
            <option value="final">Finalizado · control realizado</option>
          </select>
        </Field>
        <p className="hint full">
          Finalizar cambia el estado a «Atendida». Una fecha orientativa no reserva horario:
          programa el próximo control por separado.
        </p>
      </Form>
    </Modal>
  );
}
