import { CalendarDays, CheckCircle2, LockKeyhole } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import type { StaffProfile } from '../auth/RequireStaff';
import { SignOutButton } from '../auth/components/SignOutButton';
import { Brand } from '../../shared/ui/Brand';
import { facility } from '../../shared/config/facility';

export function AgendaPage() {
  const profile = useOutletContext<StaffProfile>();
  return <div className="workspace"><header className="workspace-header"><Brand /><div className="header-actions"><span className="muted">IPRESS {facility.ipressCode}</span><SignOutButton /></div></header><main id="main-content" className="workspace-main"><p className="overline">{facility.shortName} · {profile.role === 'admin' ? 'ADMINISTRACIÓN' : 'ENFERMERÍA'}</p><h1>Hola, {profile.full_name}.</h1><p className="muted">{new Intl.DateTimeFormat('es-PE', { timeZone: facility.timeZone, dateStyle: 'full' }).format(new Date())}</p><section className="module-placeholder"><div className="access-icon"><CalendarDays size={28} /></div><h2>Tu espacio de trabajo está listo</h2><p>El acceso ya está implementado. La agenda, el padrón y el seguimiento se incorporarán en las siguientes entregas.</p><div className="capability-list"><span><CheckCircle2 size={17} />Identidad verificada</span><span><LockKeyhole size={17} />Perfil autorizado</span></div></section></main></div>;
}
