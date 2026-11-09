import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import AdminPage from './AdminPage';
import type { StaffRole } from '../../shared/types';

const fixture = vi.hoisted(() => ({
  invoke: vi.fn(),
  mutate: vi.fn(),
  refresh: vi.fn(),
  notify: vi.fn(),
}));
vi.mock('../../shared/lib/data', () => ({
  db: () => ({ functions: { invoke: fixture.invoke } }),
  mutate: fixture.mutate,
  messageFor: () => 'No se pudo guardar',
  useData: () => ({
    refresh: fixture.refresh,
    notify: fixture.notify,
    closedDays: [],
    staff: [
      {
        id: 'admin',
        full_name: 'Administrador prueba',
        username: 'admin',
        role: 'admin',
        active: true,
      },
      {
        id: 'manager',
        full_name: 'Responsable prueba',
        username: 'responsable',
        role: 'manager',
        active: true,
      },
      { id: 'nurse', full_name: 'Enfermera prueba', username: 'enf1', role: 'nurse', active: true },
    ],
    settings: {
      revision: 1,
      display_name: 'CSMI El Milagro',
      opens_at: '08:00',
      closes_at: '13:00',
      slot_minutes: 30,
      room_count: 2,
      working_days: [1, 2, 3, 4, 5],
      rule_version: 'NTS 238 / 2025',
      rule_source: 'https://www.gob.pe/minsa',
      rules_approved: false,
    },
  }),
}));
function renderPage(role: StaffRole) {
  return render(
    <MemoryRouter initialEntries={['/administracion']}>
      <Routes>
        <Route
          element={
            <Outlet context={{ id: role, full_name: 'Personal prueba', role, active: true }} />
          }
        >
          <Route path="/administracion" element={<AdminPage />} />
        </Route>
        <Route path="/agenda" element={<h1>Agenda del día</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  fixture.invoke.mockResolvedValue({ data: { id: 'created' }, error: null });
  fixture.mutate.mockResolvedValue({ id: '1' });
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
});
describe('staff management UI', () => {
  it('restores a nurse password directly from the panel', async () => {
    renderPage('manager');
    await userEvent.click(screen.getByRole('button', { name: 'Personal' }));
    expect(
      screen.queryByRole('button', { name: 'Restablecer contraseña de Administrador prueba' }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Restablecer contraseña de Enfermera prueba' }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByLabelText('Correo')).not.toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('Nueva contraseña'), 'Nueva-clave-12345');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar nueva contraseña' }));
    expect(fixture.invoke).toHaveBeenCalledWith('invite-staff', {
      body: { action: 'reset_password', id: 'nurse', password: 'Nueva-clave-12345' },
    });
  });
  it('edits the selected nurse without asking the responsible person for technical identifiers', async () => {
    renderPage('manager');
    await userEvent.click(screen.getByRole('button', { name: 'Personal' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Gestionar perfil de Enfermera prueba' }),
    );
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).queryByLabelText('UUID de la cuenta Supabase Auth'),
    ).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByLabelText('Acceso activo'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(fixture.mutate).toHaveBeenCalledWith('save_staff', {
      id: 'nurse',
      full_name: 'Enfermera prueba',
      username: 'enf1',
      role: 'nurse',
      active: false,
    });
  });
  it('limits manager configuration and sends only operational fields', async () => {
    renderPage('manager');
    expect(screen.queryByRole('button', { name: 'Auditoría' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Versión de la norma CRED')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nombre visible del establecimiento')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(fixture.mutate).toHaveBeenCalledWith('save_operational_settings', {
      revision: 1,
      opens_at: '08:00',
      closes_at: '13:00',
      slot_minutes: 30,
      room_count: 2,
      working_days: [1, 2, 3, 4, 5],
    });
  });
  it('lets a manager create only nursing accounts, keeping administrator profiles protected', async () => {
    renderPage('manager');
    await userEvent.click(screen.getByRole('button', { name: 'Personal' }));
    expect(
      screen.queryByRole('button', { name: 'Vincular cuenta existente' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Gestionar perfil de Administrador prueba' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Gestionar perfil de Responsable prueba' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Gestionar perfil de Enfermera prueba' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta de enfermería' }));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog)
        .getAllByRole('option')
        .map((e) => e.getAttribute('value')),
    ).toEqual(['nurse']);
    await userEvent.type(within(dialog).getByLabelText('Nombre completo'), 'Enfermera nueva');
    await userEvent.type(within(dialog).getByLabelText('Usuario'), 'enf.nueva');
    await userEvent.type(within(dialog).getByLabelText('Contraseña inicial'), 'Clave-inicial-1234');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Crear cuenta' }));
    expect(fixture.invoke).toHaveBeenCalledWith('invite-staff', {
      body: {
        full_name: 'Enfermera nueva',
        username: 'enf.nueva',
        role: 'nurse',
        password: 'Clave-inicial-1234',
      },
    });
    expect(fixture.notify).toHaveBeenCalledWith(expect.stringContaining('Cuenta creada'));
  });
  it('exposes manager assignment only to administrators', async () => {
    renderPage('admin');
    expect(screen.getByRole('button', { name: 'Auditoría' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Personal' }));
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(
      within(screen.getByRole('dialog')).getByRole('option', {
        name: 'Responsable del aplicativo',
      }),
    ).toHaveValue('manager');
  });
  it('redirects nursing staff away from management', () => {
    renderPage('nurse');
    expect(screen.getByRole('heading', { name: 'Agenda del día' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Personal' })).not.toBeInTheDocument();
  });
});
