import { render, screen, fireEvent } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import type { Appointment } from '../../shared/types';
import { EncounterForm } from './EncounterForm';
vi.mock('../../shared/ui/Modal', () => ({ Modal: ({ children }: any) => <div>{children}</div> }));
const state = vi.hoisted(() => ({ revision: 1, saved: null as unknown }));
vi.mock('../../shared/lib/data', () => ({
  useData: () => ({
    encounters: [
      {
        appointment_id: 'appointment',
        revision: state.revision,
        performed_on: '2026-01-02',
        observations: 'Texto original',
      },
    ],
    children: [{ id: 'child', full_name: 'Prueba' }],
  }),
}));
vi.mock('../../shared/ui/Forms', () => ({
  Field: ({ label, children }: any) => (
    <label>
      {label}
      {children}
    </label>
  ),
  text: (f: FormData, key: string) => String(f.get(key) || ''),
  Form: ({ children, payload }: any) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        state.saved = payload(new FormData(e.currentTarget));
      }}
    >
      {children}
      <button>Guardar prueba</button>
    </form>
  ),
}));
it('keeps the opened revision when live data changes and uses the actual date as the next-date minimum', () => {
  const appointment = {
    id: 'appointment',
    child_id: 'child',
    starts_at: '2026-01-01T08:00:00-05:00',
  } as Appointment;
  const props = { appointment, onClose: vi.fn() };
  const view = render(<EncounterForm {...props} />);
  fireEvent.change(screen.getByLabelText('Observaciones y resultado'), {
    target: { value: 'Edición local' },
  });
  state.revision = 2;
  view.rerender(<EncounterForm {...props} />);
  fireEvent.change(screen.getByLabelText('Fecha real del control'), {
    target: { value: '2026-01-03' },
  });
  expect(screen.getByLabelText('Próxima fecha orientativa (opcional)')).toHaveAttribute(
    'min',
    '2026-01-03',
  );
  fireEvent.submit(screen.getByText('Guardar prueba').closest('form')!);
  expect(state.saved).toMatchObject({
    revision: 1,
    observations: 'Edición local',
    performed_on: '2026-01-03',
  });
});
