import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { it, expect, vi } from 'vitest';
import FollowupPage from './FollowupPage';
vi.mock('../../shared/lib/data', () => ({
  getRows: async () => [],
  messageFor: () => '',
  useData: () => ({
    children: [
      { id: 'a', full_name: 'Lucía Pérez', document_number: '00123456' },
      { id: 'b', full_name: 'Mateo Ruiz', document_number: '00987654' },
    ],
    staff: [{ id: 'nurse', full_name: 'Ana', role: 'nurse' }],
    followups: [
      {
        id: 'one',
        child_id: 'a',
        assigned_to: 'nurse',
        status: 'open',
        reason: 'Llamar',
        next_action: 'Contacto',
      },
      {
        id: 'two',
        child_id: 'b',
        assigned_to: 'nurse',
        status: 'resolved',
        reason: 'Resuelto',
        resolution: 'Se coordinó',
      },
    ],
  }),
}));
it('searches names without accents and documents while respecting state filters', async () => {
  render(
    <MemoryRouter>
      <FollowupPage />
    </MemoryRouter>,
  );
  const search = screen.getByRole('searchbox', { name: 'Buscar niño o niña' });
  await userEvent.type(search, 'lucia');
  expect(screen.getByRole('link', { name: 'Lucía Pérez' })).toBeInTheDocument();
  await userEvent.clear(search);
  await userEvent.type(search, '00987654');
  expect(screen.getByText('No hay seguimientos para estos filtros.')).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText('Estado'), 'all');
  expect(screen.getByRole('link', { name: 'Mateo Ruiz' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Lucía Pérez' })).not.toBeInTheDocument();
  await userEvent.clear(search);
  await waitFor(() => expect(screen.getByText('2 seguimientos')).toBeInTheDocument());
});
