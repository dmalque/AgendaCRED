import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  addDays,
  addMonths,
  ageMonths,
  dateOnly,
  limaInstant,
  overlaps,
  suggestControl,
} from './dates';
afterEach(() => vi.useRealTimers());
describe('calendar and scheduling', () => {
  it('handles leap days and end of month without skipping months', () => {
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2025-01-31', 1)).toBe('2025-02-28');
    expect(addDays('2024-02-28', 2)).toBe('2024-03-01');
  });
  it('calculates calendar age, preserving birthday boundaries', () => {
    expect(ageMonths('2025-06-10', '2026-06-09')).toBe(11);
    expect(ageMonths('2025-06-10', '2026-06-10')).toBe(12);
  });
  it('stores Lima slots as UTC and recovers their local day', () => {
    expect(limaInstant('2026-11-06', '08:00')).toBe('2026-11-06T13:00:00.000Z');
    expect(dateOnly('2026-11-07T03:30:00Z')).toBe('2026-11-06');
    expect(dateOnly('2026-11-06')).toBe('2026-11-06');
  });
  it('allows adjoining slots but catches partial overlap', () => {
    const a = { starts_at: '2026-11-06T13:00:00Z', ends_at: '2026-11-06T13:30:00Z' };
    expect(overlaps(a, { starts_at: a.ends_at, ends_at: '2026-11-06T14:00:00Z' })).toBe(false);
    expect(
      overlaps(a, { starts_at: '2026-11-06T13:15:00Z', ends_at: '2026-11-06T13:45:00Z' }),
    ).toBe(true);
  });
  it('does not suggest a clinical schedule before local validation or without history', () => {
    expect(suggestControl('2026-01-01', '2026-07-01', false).date).toBeNull();
    expect(suggestControl('2026-01-01', null, true).date).toBeNull();
  });
  it('keeps the next proposal after both birthday milestone and last-control interval', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-06T17:00:00Z'));
    const result = suggestControl('2025-01-01', '2026-01-15', true);
    expect(result.date).toBe('2026-04-15');
  });
  it('does not invent newborn controls and handles the first infant control at 29 days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-06T17:00:00Z'));
    expect(suggestControl('2026-10-20', '2026-10-25', true).date).toBeNull();
    expect(suggestControl('2026-01-01', '2026-01-30', true).date).toBe('2026-03-01');
  });
});
