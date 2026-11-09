import { facility } from '../config/facility';
export const todayLima = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: facility.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export const dateOnly = (iso: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? iso
    : new Intl.DateTimeFormat('en-CA', {
        timeZone: facility.timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(iso));
export const timeOnly = (iso: string) =>
  new Intl.DateTimeFormat('es-PE', {
    timeZone: facility.timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
export const showDate = (date: string) =>
  new Date(date.length === 10 ? `${date}T12:00:00-05:00` : date).toLocaleDateString('es-PE', {
    timeZone: facility.timeZone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function addMonths(date: string, months: number) {
  const d = new Date(`${date}T12:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}
export function ageMonths(dob: string, at = todayLima()) {
  const b = new Date(`${dob}T12:00:00Z`),
    a = new Date(`${at}T12:00:00Z`);
  return (
    (a.getUTCFullYear() - b.getUTCFullYear()) * 12 +
    a.getUTCMonth() -
    b.getUTCMonth() -
    (a.getUTCDate() < b.getUTCDate() ? 1 : 0)
  );
}
export function ageLabel(dob: string) {
  const m = ageMonths(dob);
  if (m < 1) return `${Math.floor((Date.parse(todayLima()) - Date.parse(dob)) / 86400000)} días`;
  return m < 24 ? `${m} meses` : `${Math.floor(m / 12)} años${m % 12 ? ` y ${m % 12} meses` : ''}`;
}
export function limaInstant(date: string, time: string) {
  return new Date(`${date}T${time}:00-05:00`).toISOString();
}
export function overlaps(
  a: { starts_at: string; ends_at: string },
  b: { starts_at: string; ends_at: string },
) {
  return (
    Date.parse(a.starts_at) < Date.parse(b.ends_at) &&
    Date.parse(b.starts_at) < Date.parse(a.ends_at)
  );
}

export function suggestControl(
  dob: string,
  last: string | null,
  approved: boolean,
): { date: string | null; reason: string } {
  if (!approved)
    return {
      date: null,
      reason:
        'Las reglas requieren validación de la responsable de enfermería. Elige una fecha manualmente.',
    };
  if (ageMonths(dob) >= 144)
    return {
      date: null,
      reason: 'Fuera del rango CRED de esta agenda. Revisar continuidad de atención.',
    };
  if (!last)
    return {
      date: null,
      reason:
        'Sin un control previo documentado. Verifica antecedentes antes de confirmar la fecha.',
    };
  const days = Math.floor((Date.parse(last) - Date.parse(dob)) / 86400000);
  if (days < 29)
    return {
      date: null,
      reason:
        'Recién nacido: confirmar alta y ventanas de los 3 controles; elegir la fecha con revisión profesional.',
    };
  const months = ageMonths(dob, last);
  const milestones = [
    1, 2, 3, 4, 6, 7, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60, 72, 84, 96, 108, 120, 132,
  ];
  const previous = days < 60 ? 1 : [...milestones].reverse().find((m) => m <= months) || 1;
  const next = milestones.find((m) => m > previous);
  if (!next) return { date: null, reason: 'Revisar continuidad fuera de los hitos disponibles.' };
  const interval = next <= 12 ? (next - previous) * 30 : next <= 24 ? 90 : next <= 60 ? 180 : 360;
  const target = addMonths(dob, next),
    minimum = addDays(last, interval);
  const date = target > minimum ? target : minimum;
  return {
    date,
    reason: `Propuesta para revisión: hito de ${next} meses e intervalo desde el último control. ${date < todayLima() ? 'Fecha orientativa vencida; elegir un horario actual.' : 'Confirma antecedentes y condiciones antes de programar.'}`,
  };
}
