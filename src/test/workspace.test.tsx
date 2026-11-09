import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Workspace } from '../app/Workspace';
import AgendaPage from '../features/agenda/AgendaPage';
import { todayLima } from '../shared/lib/dates';
import { mutate } from '../shared/lib/data';

const fixture = vi.hoisted(() => ({ refresh: vi.fn(), notify: vi.fn(), mutate: vi.fn() }));
vi.mock('../shared/lib/data', async () => {
  const { todayLima } = await import('../shared/lib/dates');
  const date = todayLima();
  return {
    mutate: fixture.mutate,
    messageFor: () => 'Error de prueba',
    DataProvider: ({ children }: { children: React.ReactNode }) => children,
    useData: () => ({
      loading: false,
      error: '',
      version: 1,
      refresh: fixture.refresh,
      notify: fixture.notify,
      children: [
        {
          id: 'child-1',
          full_name: 'Lucía Ejemplo',
          document_number: 'DEMO-01',
          document_type: 'PROVISIONAL',
          birth_date: '2025-01-01',
          guardian_name: 'Cuidadora Ejemplo',
          phone: '000 000 000',
          address: 'Dirección ficticia',
        },
        {
          id: 'child-2',
          full_name: 'Mateo Ejemplo',
          document_number: 'DEMO-02',
          birth_date: '2025-03-01',
        },
      ],
      appointments: [
        {
          id: 'appointment-1',
          child_id: 'child-1',
          nurse_id: 'nurse-1',
          starts_at: `${date}T08:00:00-05:00`,
          ends_at: `${date}T08:30:00-05:00`,
          room: 1,
          status: 'scheduled',
          revision: 3,
        },
        {
          id: 'appointment-2',
          child_id: 'child-2',
          nurse_id: 'nurse-1',
          starts_at: `${date}T08:30:00-05:00`,
          ends_at: `${date}T09:00:00-05:00`,
          room: 1,
          status: 'arrived',
          revision: 1,
        },
      ],
      staff: [{ id: 'nurse-1', full_name: 'Enfermera de prueba', role: 'nurse', active: true }],
      encounters: [],
      followups: [
        { id: 'task-1', child_id: 'child-1', reason: 'Recuperar control anterior', status: 'open' },
      ],
      closedDays: [],
      settings: {
        display_name: 'CSMI El Milagro',
        opens_at: '08:00',
        closes_at: '13:00',
        slot_minutes: 30,
        room_count: 2,
        working_days: [1, 2, 3, 4, 5],
        rules_approved: false,
      },
    }),
  };
});
function renderWorkspace(role: 'admin' | 'manager' | 'nurse' = 'nurse') {
  return render(
    <MemoryRouter initialEntries={['/agenda']}>
      <Routes>
        <Route
          element={
            <Outlet
              context={{
                id: 'nurse-1',
                full_name: 'Enfermera de prueba',
                role,
                active: true,
              }}
            />
          }
        >
          <Route element={<Workspace />}>
            <Route path="/agenda" element={<AgendaPage />} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  fixture.mutate.mockResolvedValue({ id: 'appointment-1' });
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
});
describe('agenda del equipo', () => {
  it('shows management and password access to the responsible person', () => {
    renderWorkspace('manager');
    expect(screen.getByRole('link', { name: 'Gestión del consultorio' })).toHaveAttribute(
      'href',
      '/administracion',
    );
    expect(screen.getByText('Responsable del aplicativo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cambiar mi contraseña' })).toHaveAttribute(
      'href',
      '/actualizar-clave',
    );
  });
  it('separates attendance from completed controls and confirms absences before saving', async () => {
    renderWorkspace();
    expect(screen.getByText('Llegó')).toBeInTheDocument();
    expect(screen.getByText('Programada')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'No asistió' }));
    expect(mutate).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(mutate).toHaveBeenCalledWith('appointment_status', {
      id: 'appointment-1',
      revision: 3,
      status: 'no_show',
      reason: '',
    });
  });
  it('shows the institution and date without administrative actions for a nurse', async () => {
    const result = renderWorkspace();
    expect(screen.getAllByText('CSMI El Milagro').length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Programar control' })).toBeInTheDocument();
    if (process.env.CRED_CAPTURE_UI === '1') {
      const directory = resolve(process.cwd(), '.qa');
      await mkdir(directory, { recursive: true });
      const css =
        (await readFile(resolve(process.cwd(), 'src/styles/index.css'), 'utf8')) +
        (await readFile(resolve(process.cwd(), 'src/styles/workspace.css'), 'utf8'));
      await writeFile(
        resolve(directory, 'agenda.html'),
        `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Agenda CRED · Revisión visual con datos ficticios</title><style>${css}</style><body><div style="background:#fff3df;color:#6d4b20;padding:8px 20px;font:12px system-ui">REVISIÓN VISUAL · DATOS FICTICIOS · ${todayLima()}</div>${result.container.innerHTML}</body></html>`,
      );
    }
  });
});
