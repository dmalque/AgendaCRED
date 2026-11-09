import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DateInput } from './DateInput';
it('uses four-digit year bounds and preserves a stricter maximum', () => {
  const view = render(<DateInput aria-label="Fecha" />);
  expect(screen.getByLabelText('Fecha')).toHaveAttribute('max', '9999-12-31');
  view.rerender(<DateInput aria-label="Fecha" max="2026-11-09" />);
  expect(screen.getByLabelText('Fecha')).toHaveAttribute('max', '2026-11-09');
});
it('rejects an extended year and keeps the previous date', () => {
  const onChange = vi.fn();
  render(<DateInput aria-label="Fecha" defaultValue="2026-01-01" onChange={onChange} />);
  const input = screen.getByLabelText('Fecha') as HTMLInputElement;
  fireEvent.change(input, { target: { value: '123456-01-01' } });
  expect(input.value).toBe('2026-01-01');
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: '2026-02-02' } });
  expect(input.value).toBe('2026-02-02');
  expect(input.validity.customError).toBe(false);
  expect(onChange).toHaveBeenCalledOnce();
});
