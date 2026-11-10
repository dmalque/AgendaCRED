import { it, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Workspace } from '../app/Workspace';
import Agenda from '../features/agenda/AgendaPage';
import Followup from '../features/followup/FollowupPage';
import Children from '../features/children/ChildrenPage';
import Reports from '../features/reports/ReportsPage';
import Admin from '../features/admin/AdminPage';
import { ChildForm } from '../features/children/ChildForm';
import { AppointmentForm } from '../features/agenda/AppointmentForm';
import { EncounterForm } from '../features/agenda/EncounterForm';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { todayLima } from '../shared/lib/dates';
const demo = vi.hoisted(() => ({ data: null as any }));
vi.mock('../shared/lib/data', () => ({
  DataProvider: ({ children }: any) => children,
  useData: () => demo.data,
  getRows: async () => [],
  messageFor: () => '',
  mutate: vi.fn(),
}));
vi.mock('../features/auth/AuthProvider', () => ({
  useAuth: () => ({ session: null, loading: false, recovery: false, error: null }),
}));
vi.mock('../shared/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: null }));
it.skipIf(process.env.CRED_GUIDE_CAPTURE !== '1')(
  'captures current interface with fictional data',
  async () => {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
    };
    const day = todayLima();
    const nurse = {
      id: 'nurse',
      username: 'ana.demo',
      full_name: 'Ana Enfermera',
      role: 'nurse',
      active: true,
    };
    const admin = { ...nurse, id: 'admin', full_name: 'Responsable Demo', role: 'admin' };
    const children = [
      {
        id: 'child',
        full_name: 'Lucía Ejemplo',
        document_number: 'DEMO-001',
        document_type: 'PROVISIONAL',
        birth_date: '2025-06-10',
        sex: 'F',
        guardian_name: 'Cuidadora Ejemplo',
        guardian_relationship: 'Madre',
        phone: '000000000',
        address: 'Dirección de demostración',
        notes: '',
        history_number: 'HC-DEMO',
        archived: false,
        revision: 1,
      },
      {
        id: 'child2',
        full_name: 'Mateo Ejemplo',
        document_number: 'DEMO-002',
        document_type: 'PROVISIONAL',
        birth_date: '2025-08-12',
        sex: 'M',
        guardian_name: 'Cuidador Ejemplo',
        guardian_relationship: 'Padre',
        phone: '000000000',
        address: 'Dirección de demostración',
        archived: false,
        revision: 1,
      },
    ];
    const appointments = [
      {
        id: 'appointment',
        child_id: 'child',
        nurse_id: 'nurse',
        starts_at: day + 'T08:00:00-05:00',
        ends_at: day + 'T08:30:00-05:00',
        status: 'arrived',
        room: 1,
        reason: 'Control CRED',
        revision: 1,
      },
      {
        id: 'appointment2',
        child_id: 'child2',
        nurse_id: 'nurse',
        starts_at: day + 'T09:00:00-05:00',
        ends_at: day + 'T09:30:00-05:00',
        status: 'scheduled',
        room: 2,
        reason: 'Control CRED',
        revision: 1,
      },
    ];
    demo.data = {
      children,
      appointments,
      encounters: [],
      followups: [
        {
          id: 'f1',
          child_id: 'child',
          assigned_to: 'nurse',
          status: 'open',
          reason: 'Recuperar control por inasistencia',
          next_action: 'Llamar a la cuidadora',
          next_date: day,
          revision: 1,
        },
        {
          id: 'f2',
          child_id: 'child2',
          assigned_to: 'nurse',
          status: 'contacted',
          reason: 'Confirmar próxima programación',
          next_action: 'Coordinar nueva fecha',
          next_date: day,
          revision: 1,
        },
      ],
      staff: [nurse, admin],
      closedDays: [],
      settings: {
        id: 1,
        display_name: 'CSMI El Milagro',
        ipress_code: '00005222',
        opens_at: '08:00',
        closes_at: '13:00',
        slot_minutes: 30,
        room_count: 2,
        room_aliases: { '1': 'CRED A', '2': 'CRED B' },
        working_days: [1, 2, 3, 4, 5],
        rule_version: 'NTS 238 / 2025',
        rule_source: 'Norma institucional',
        rules_approved: false,
        revision: 1,
      },
      loading: false,
      error: '',
      version: 1,
      refresh: async () => {},
      notify: () => {},
    };
    await mkdir('.qa/guia', { recursive: true });
    const css =
      (await readFile('src/styles/index.css', 'utf8')) +
      (await readFile('src/styles/workspace.css', 'utf8'));
    const pages: any[] = [
      ['login', <LoginPage />],
      ['agenda', <Agenda />],
      ['ninos', <Children />],
      ['seguimiento', <Followup />],
      ['reportes', <Reports />],
      ['configuracion', <Admin />],
      ['registrar', <ChildForm onClose={() => {}} onSaved={() => {}} />],
      ['programar', <AppointmentForm childId="child" onClose={() => {}} />],
      ['atencion', <EncounterForm appointment={appointments[0] as any} onClose={() => {}} />],
    ];
    for (const [name, page] of pages) {
      const view = render(
        <MemoryRouter initialEntries={['/demo']}>
          <Routes>
            <Route element={<Outlet context={name === 'configuracion' ? admin : nurse} />}>
              {name === 'login' ? (
                <Route path="/demo" element={page} />
              ) : (
                <Route element={<Workspace />}>
                  <Route path="/demo" element={page} />
                </Route>
              )}
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      await writeFile(
        '.qa/guia/' + name + '.html',
        '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Guía AgendaCRED</title><style>' +
          css +
          ' .guide-demo {background:#fff2ce;color:#574319;padding:7px 20px;font:12px Arial;} .auth-minimal{min-height:calc(100vh - 28px)} dialog[open]{position:absolute;top:44px;margin:0 auto;max-height:calc(100vh - 64px);}</style><body><div class="guide-demo">CAPTURA DE DEMOSTRACIÓN CON DATOS FICTICIOS</div>' +
          view.container.innerHTML +
          '</body></html>',
      );
      cleanup();
    }
  },
);
