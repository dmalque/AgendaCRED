import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { signIn } from '../auth.service';

vi.mock('../AuthProvider', () => ({ useAuth: () => ({ session: null, loading: false, recovery: false, error: null }) }));
vi.mock('../../../shared/lib/supabase', () => ({ isSupabaseConfigured: true }));
vi.mock('../auth.service', () => ({ signIn: vi.fn() }));
function mount() { render(<MemoryRouter><LoginPage /></MemoryRouter>); }
beforeEach(() => { vi.mocked(signIn).mockReset(); });
describe('login behavior', () => {
  it('validates before contacting Auth', async () => {
    mount(); await userEvent.click(screen.getByRole('button', { name: /Ingresar a mi agenda/ }));
    expect(screen.getByText('Ingresa un correo electrónico válido.')).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });
  it('toggles password visibility without submitting', async () => {
    mount(); const field = screen.getByLabelText('Contraseña', { exact: true });
    expect(field).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(field).toHaveAttribute('type', 'text'); expect(signIn).not.toHaveBeenCalled();
  });
  it('uses Supabase credentials and reports a safe failure', async () => {
    vi.mocked(signIn).mockRejectedValue({ code: 'invalid_credentials' });
    mount(); await userEvent.type(screen.getByLabelText('Correo institucional'), 'Ana@Centro.pe');
    await userEvent.type(screen.getByLabelText('Contraseña', { exact: true }), 'example-password');
    await userEvent.click(screen.getByRole('button', { name: /Ingresar a mi agenda/ }));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith('ana@centro.pe', 'example-password'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Revisa tu correo y contraseña');
  });
  it('identifies the facility without offering appearance controls', () => {
    mount();
    expect(screen.getByText('IPRESS 00005222 · RENIPRESS')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tema oscuro' })).not.toBeInTheDocument();
  });
});
