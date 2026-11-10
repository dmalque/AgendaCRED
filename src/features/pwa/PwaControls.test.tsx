import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, it, expect, vi } from 'vitest';
import { PwaControls } from './PwaControls';
beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
});
it('offers installation after the browser provides an install prompt', async () => {
  render(<PwaControls />);
  const event = new Event('beforeinstallprompt', { cancelable: true });
  const prompt = vi.fn().mockResolvedValue(undefined);
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome: 'accepted' }) });
  fireEvent(window, event);
  expect(event.defaultPrevented).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Instalar' }));
  await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
  fireEvent(window, new Event('appinstalled'));
  expect(
    screen.queryByRole('complementary', { name: 'Instalar AgendaCRED' }),
  ).not.toBeInTheDocument();
});
it('shows a connection warning and removes it on reconnection', () => {
  render(<PwaControls />);
  fireEvent(window, new Event('offline'));
  expect(screen.getByRole('status')).toHaveTextContent('Sin conexión');
  fireEvent(window, new Event('online'));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
