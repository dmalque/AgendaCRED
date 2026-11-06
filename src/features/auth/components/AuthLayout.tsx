import type { PropsWithChildren } from 'react';
import { CalendarDays, Check, Heart, ShieldCheck, Users } from 'lucide-react';
import { Brand } from '../../../shared/ui/Brand';
import { facility } from '../../../shared/config/facility';

export function AuthLayout({ children }: PropsWithChildren) {
  return <div className="auth-page">
    <header className="auth-header"><Brand /><div className="facility-identification"><strong>{facility.shortName}</strong><span>IPRESS {facility.ipressCode} · {facility.registry}</span></div></header>
    <main className="auth-grid" id="main-content">
      <section className="welcome-panel" aria-labelledby="welcome-title">
        <div className="eyebrow"><span className="live-dot" />CRECIMIENTO Y DESARROLLO</div>
        <h1 id="welcome-title">Más cerca de cada<br /><span>pequeño paso.</span></h1>
        <p className="welcome-copy">La agenda de crecimiento y desarrollo del {facility.fullName}. Organiza los controles y acompaña el trabajo de tu equipo.</p>
        <div className="agenda-illustration" aria-hidden="true">
          <div className="illustration-top"><span className="illustration-icon"><CalendarDays size={20} /></span><div><strong>Un día bien organizado</strong><span>Todo el equipo, en una agenda</span></div><span className="mini-dots">•••</span></div>
          <div className="illustration-days">{['L', 'M', 'M', 'J', 'V'].map((d, i) => <span key={i} className={i === 2 ? 'selected' : ''}>{d}<strong>{12 + i}</strong></span>)}</div>
          <div className="illustration-entry"><span className="illustration-hour">08:00</span><span className="line-mark" /><div><strong>Control de crecimiento</strong><span>Programación confirmada</span></div><Check size={18} /></div>
          <div className="illustration-entry"><span className="illustration-hour">08:30</span><span className="line-mark secondary" /><div><strong>Seguimiento del desarrollo</strong><span>Próximo control</span></div><span className="tiny-circle" /></div>
          <div className="illustration-caption"><Users size={14} /> Pensada para trabajar en equipo</div>
        </div>
        <div className="welcome-note"><Heart size={18} aria-hidden="true" /><span>Menos tiempo organizando.<br /><strong>Más tiempo acompañando.</strong></span></div>
      </section>
      <section className="access-panel" aria-label="Acceso del personal">{children}</section>
    </main>
    <footer className="auth-footer"><span><ShieldCheck size={14} aria-hidden="true" />Acceso exclusivo para personal autorizado</span><span>Apoyo interno · Complementario al HIS y a la historia clínica</span></footer>
  </div>;
}
