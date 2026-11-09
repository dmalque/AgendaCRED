import { dateOnly } from '../../shared/lib/dates';
import type { Appointment, Encounter } from '../../shared/types';
export function filterReport(
  appointments: Appointment[],
  encounters: Encounter[],
  filters: {
    from: string;
    to: string;
    nurse: string;
    status: string;
    basis: 'scheduled' | 'performed';
  },
) {
  const actual = new Map(
    encounters.filter((e) => e.status === 'final').map((e) => [e.appointment_id, e.performed_on]),
  );
  return appointments
    .filter((a) => {
      const day = filters.basis === 'performed' ? actual.get(a.id) : dateOnly(a.starts_at);
      return (
        !!day &&
        day >= filters.from &&
        day <= filters.to &&
        (!filters.nurse || a.nurse_id === filters.nurse) &&
        (!filters.status || a.status === filters.status)
      );
    })
    .sort(
      (a, b) =>
        (filters.basis === 'performed' ? actual.get(a.id)!.localeCompare(actual.get(b.id)!) : 0) ||
        a.starts_at.localeCompare(b.starts_at),
    );
}
