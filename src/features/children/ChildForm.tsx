import { DateInput } from '../../shared/ui/DateInput';
import type { Child } from '../../shared/types';
import { useState } from 'react';
import { Modal } from '../../shared/ui/Modal';
import { Field, Form, text } from '../../shared/ui/Forms';
import { todayLima } from '../../shared/lib/dates';
const relationships = [
  'Madre',
  'Padre',
  'Abuela',
  'Abuelo',
  'Tía',
  'Tío',
  'Hermana',
  'Hermano',
  'Tutor/a legal',
  'Otro familiar',
  'Otro cuidador',
];
export function ChildForm({
  child,
  onClose,
  onSaved,
}: {
  child?: Child;
  onClose: () => void;
  onSaved: (id?: string) => void;
}) {
  const [documentType, setDocumentType] = useState(child?.document_type || 'PROVISIONAL');
  return (
    <Modal title={child ? 'Actualizar ficha del niño' : 'Registrar niño o niña'} onClose={onClose}>
      <Form
        action="save_child"
        onSuccess={onSaved}
        payload={(f) => ({
          ...Object.fromEntries(f),
          sex: text(f, 'sex') || child?.sex || 'NR',
          ...(child ? { id: child.id, revision: child.revision } : {}),
          document_number: text(f, 'document_number') || `PROV-${crypto.randomUUID().slice(0, 12)}`,
        })}
      >
        <div className="full">
          <Field label="Nombres y apellidos">
            <input
              name="full_name"
              defaultValue={child?.full_name}
              required
              minLength={3}
              maxLength={150}
            />
          </Field>
        </div>
        <Field label="Tipo de documento">
          <select
            name="document_type"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
          >
            <option value="PROVISIONAL">Sin documento / provisional</option>
            <option>DNI</option>
            <option>CNV</option>
            <option>CE</option>
          </select>
        </Field>
        <Field label="Número de documento o código">
          <input
            name="document_number"
            defaultValue={child?.document_number}
            required={documentType !== 'PROVISIONAL'}
            pattern={documentType === 'DNI' ? '[0-9]{8}' : undefined}
            inputMode={documentType === 'DNI' ? 'numeric' : 'text'}
            maxLength={documentType === 'DNI' ? 8 : 30}
            placeholder={
              documentType === 'PROVISIONAL'
                ? 'Vacío: genera código provisional'
                : 'Número del documento'
            }
          />
        </Field>
        <Field label="Fecha de nacimiento">
          <DateInput
            name="birth_date"
            defaultValue={child?.birth_date}
            max={todayLima()}
            required
          />
        </Field>
        <div className="data-field" role="group" aria-labelledby="child-sex-label">
          <span id="child-sex-label">Sexo registrado</span>
          <div className="sex-options">
            <label className="sex-choice">
              <input
                type="radio"
                name="sex"
                value="M"
                defaultChecked={child?.sex === 'M'}
                required={!child}
              />
              Masculino
            </label>
            <label className="sex-choice">
              <input
                type="radio"
                name="sex"
                value="F"
                defaultChecked={child?.sex === 'F'}
                required={!child}
              />
              Femenino
            </label>
          </div>
          {child?.sex === 'NR' && <span className="hint">Actualmente sin registrar.</span>}
        </div>
        <Field label="Historia clínica (opcional)">
          <input name="history_number" defaultValue={child?.history_number} maxLength={40} />
        </Field>
        <Field label="Madre, padre o cuidador">
          <input
            name="guardian_name"
            defaultValue={child?.guardian_name}
            required
            minLength={3}
            maxLength={150}
          />
        </Field>
        <Field label="Parentesco">
          <select
            name="guardian_relationship"
            defaultValue={child?.guardian_relationship || ''}
            required
          >
            <option value="" disabled>
              Seleccionar parentesco
            </option>
            {child?.guardian_relationship &&
              !relationships.includes(child.guardian_relationship) && (
                <option value={child.guardian_relationship}>{child.guardian_relationship}</option>
              )}
            {relationships.map((relationship) => (
              <option key={relationship} value={relationship}>
                {relationship}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Teléfono de contacto">
          <input
            name="phone"
            type="tel"
            defaultValue={child?.phone}
            required
            minLength={6}
            maxLength={30}
          />
        </Field>
        <div className="full">
          <Field label="Dirección y referencia">
            <input
              name="address"
              defaultValue={child?.address}
              required
              minLength={3}
              maxLength={300}
            />
          </Field>
        </div>
        <div className="full">
          <Field label="Observación operativa (opcional)">
            <textarea name="notes" defaultValue={child?.notes} maxLength={2000} rows={2} />
          </Field>
        </div>
        <p className="hint full">
          Si obtiene DNI posteriormente, actualiza esta misma ficha. El documento no permite
          consultar datos sin iniciar sesión.
        </p>
      </Form>
    </Modal>
  );
}
