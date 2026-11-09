import type { Settings } from '../types';
export function roomLabel(number: number, settings: Settings | null) {
  const alias = settings?.room_aliases?.[String(number)]?.trim();
  return 'Consultorio ' + number + (alias ? ' · ' + alias : '');
}
