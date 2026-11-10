import { expect, it } from 'vitest';
import { filterReport } from './report.logic';
import type { Appointment, Encounter } from '../../shared/types';
it('reports controls by their real attention date instead of the missed appointment date', () => {
  const appointments = [
    { id: 'a', nurse_id: 'n', starts_at: '2026-10-31T13:00:00Z', status: 'completed' },
  ] as Appointment[];
  const encounters = [
    { appointment_id: 'a', status: 'final', performed_on: '2026-11-02' },
  ] as Encounter[];
  const filters = { from: '2026-11-01', to: '2026-11-30', nurse: '', status: '' };
  expect(filterReport(appointments, encounters, { ...filters, basis: 'scheduled' })).toHaveLength(
    0,
  );
  expect(filterReport(appointments, encounters, { ...filters, basis: 'performed' })).toHaveLength(
    1,
  );
});
