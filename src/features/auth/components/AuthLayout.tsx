import type { PropsWithChildren } from 'react';
import { Brand } from '../../../shared/ui/Brand';
import { facility } from '../../../shared/config/facility';
export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="auth-page auth-minimal">
      <header className="auth-minimal-header">
        <Brand />
        <span>
          IPRESS {facility.ipressCode} · {facility.registry}
        </span>
      </header>
      <main id="main-content" className="auth-minimal-main">
        <section aria-label="Acceso del personal">{children}</section>
      </main>
      <footer className="auth-minimal-footer">Acceso del personal autorizado</footer>
    </div>
  );
}
