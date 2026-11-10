import { useState } from 'react';
import type { FormEvent, PropsWithChildren } from 'react';
import { useData, messageFor, mutate } from '../lib/data';
export function Form({
  action,
  onSuccess,
  payload,
  children,
  submitLabel = 'Guardar',
}: PropsWithChildren<{
  action: string;
  onSuccess: (id?: string) => void;
  payload: (form: FormData) => Record<string, unknown>;
  submitLabel?: string;
}>) {
  const { refresh, notify } = useData();
  const [pending, setPending] = useState(false),
    [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const form = new FormData(e.currentTarget);
    setError('');
    setPending(true);
    try {
      const result = await mutate(action, payload(form));
      await refresh();
      notify('Cambios guardados en la Base de Datos.');
      onSuccess(result.id);
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="form-grid" aria-busy={pending}>
      <fieldset disabled={pending} className="form-fields">
        {children}
      </fieldset>
      {error && (
        <p className="error-notice full" role="alert">
          {error}
        </p>
      )}
      <div className="form-footer">
        <span className="muted small">Los cambios conservan autor y fecha.</span>
        <button className="button primary" disabled={pending}>
          {pending ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
export const text = (form: FormData, key: string) => String(form.get(key) || '').trim();
export function Field({ label, children }: PropsWithChildren<{ label: string }>) {
  return (
    <label className="data-field">
      {label}
      {children}
    </label>
  );
}
export const Status = ({ value }: { value: string }) => (
  <span className={`status status-${value}`}>{statusLabels[value] || value}</span>
);
export const statusLabels: Record<string, string> = {
  scheduled: 'Programada',
  arrived: 'Llegó',
  in_progress: 'En atención',
  completed: 'Atendida',
  no_show: 'No asistió',
  cancelled: 'Cancelada',
  rescheduled: 'Reprogramada',
  draft: 'Borrador',
  final: 'Finalizada',
  open: 'Pendiente',
  contacted: 'Contactado',
  resolved: 'Resuelto',
  documented: 'Documentado',
  pending: 'Pendiente',
  unverified: 'Por verificar',
};
