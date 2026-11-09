import type { Staff, StaffRole } from '../types';

export const roleLabels: Record<StaffRole, string> = {
  admin: 'Administrador',
  manager: 'Responsable del aplicativo',
  nurse: 'Enfermería',
};
export const canManageTeam = (role: StaffRole) => role === 'admin' || role === 'manager';
export const canManageProfile = (actor: StaffRole, target: Staff) =>
  actor === 'admin' || (actor === 'manager' && target.role === 'nurse');
export const assignableRoles = (role: StaffRole): StaffRole[] =>
  role === 'admin' ? ['nurse', 'manager', 'admin'] : role === 'manager' ? ['nurse'] : [];
