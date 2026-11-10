import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Routes, Route } from 'react-router-dom';
import ChildrenPage from './ChildrenPage';
import { ChildForm } from './ChildForm';
vi.mock('../../shared/lib/data', () => ({
  useData: () => ({
    refresh: vi.fn(),
    notify: vi.fn(),
    children: [
      {
        id: '1',
        full_name: 'Lucía Ejemplo',
        document_type: 'DNI',
        document_number: '00123456',
        birth_date: '2025-01-01',
        guardian_name: 'Cuidadora prueba',
        archived: false,
      },
      {
        id: '2',
        full_name: 'Mateo Ejemplo',
        document_type: 'CNV',
        document_number: 'CNV-2',
        birth_date: '2025-01-01',
        guardian_name: 'Cuidador prueba',
        archived: false,
      },
    ],
  }),
  messageFor: () => 'Error',
  mutate: vi.fn(),
}));
describe('padrón', () => {
  it.each(['nurse', 'manager', 'admin'])('shows archived toggle only for admin (%s)', (role) => {
    render(
      <MemoryRouter initialEntries={['/ninos']}>
        <Routes>
          <Route element={<Outlet context={{ role }} />}>
            <Route path="/ninos" element={<ChildrenPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    if (role === 'admin')
      expect(screen.getByRole('checkbox', { name: 'Ver archivados' })).toBeInTheDocument();
    else expect(screen.queryByRole('checkbox', { name: 'Ver archivados' })).not.toBeInTheDocument();
  });

  it('searches document and hides unrelated children', async () => {
    render(
      <MemoryRouter>
        <ChildrenPage />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByRole('textbox', { name: 'Buscar niño' }), '00123456');
    expect(screen.getByText('Lucía Ejemplo')).toBeInTheDocument();
    expect(screen.queryByText('Mateo Ejemplo')).not.toBeInTheDocument();
  });
  it('requests exactly eight numeric digits for DNI and permits generated provisional codes', async () => {
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
    render(<ChildForm onClose={vi.fn()} onSaved={vi.fn()} />);
    const doc = screen.getByLabelText('Número de documento o código');
    expect(doc).not.toBeRequired();
    await userEvent.selectOptions(screen.getByLabelText('Tipo de documento'), 'DNI');
    expect(doc).toBeRequired();
    expect(doc).toHaveAttribute('pattern', '[0-9]{8}');
  });
});
