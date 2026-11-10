import { Link, NavLink, Outlet, useOutletContext } from 'react-router-dom';
import { CalendarDays, Users, Phone, FileDown, Settings, RefreshCw } from 'lucide-react';
import { Brand } from '../shared/ui/Brand';
import { DataProvider, useData } from '../shared/lib/data';
import { SignOutButton } from '../features/auth/components/SignOutButton';
import type { StaffProfile } from '../features/auth/RequireStaff';
import { facility } from '../shared/config/facility';
import { canManageTeam, roleLabels } from '../shared/lib/permissions';
import '../styles/workspace.css';
export function Workspace() {
  const profile = useOutletContext<StaffProfile>();
  return (
    <DataProvider>
      <WorkspaceInner profile={profile} />
    </DataProvider>
  );
}
function WorkspaceInner({ profile }: { profile: StaffProfile }) {
  const { loading, error, refresh, followups, settings } = useData();
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-identity">
            <Brand />
            <span className="facility-registration">
              IPRESS {facility.ipressCode} · {facility.registry}
            </span>
          </div>
          <div className="header-account">
            <div className="account-identity">
              <span className="avatar" aria-hidden="true">
                {profile.full_name[0]}
              </span>
              <div>
                <strong>{profile.full_name}</strong>
                <small>{roleLabels[profile.role]}</small>
              </div>
            </div>
            <div className="account-actions">
              <button
                className="button"
                onClick={() => void refresh()}
                aria-label="Actualizar datos"
              >
                <RefreshCw size={16} />
                <span>Actualizar</span>
              </button>
              <Link className="button" to="/actualizar-clave">
                Cambiar mi contraseña
              </Link>
              <SignOutButton />
            </div>
          </div>
        </div>
        <div className="navigation-band">
          <nav className="workflow-nav" aria-label="Menú principal">
            {[
              { to: '/ninos', label: 'Niños y niñas', Icon: Users },
              { to: '/agenda', label: 'Agenda', Icon: CalendarDays },
              { to: '/seguimiento', label: 'Seguimiento', Icon: Phone },
              { to: '/reportes', label: 'Reportes', Icon: FileDown },
              ...(canManageTeam(profile.role)
                ? [
                    {
                      to: '/administracion',
                      label:
                        profile.role === 'admin' ? 'Administración' : 'Gestión del consultorio',
                      Icon: Settings,
                    },
                  ]
                : []),
            ].map(({ to, label, Icon }) => (
              <NavLink key={to} to={to}>
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
                {to === '/seguimiento' && followups.some((t) => t.status !== 'resolved') && (
                  <span className="nav-count" aria-label="Seguimientos pendientes">
                    {followups.filter((t) => t.status !== 'resolved').length}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <div className="app-body">
        <main id="main-content" className="app-main">
          {error && (
            <div className="error-notice app-error" role="alert">
              {error}
              <button className="button" onClick={() => void refresh()}>
                Reintentar
              </button>
            </div>
          )}
          {loading ? (
            <div className="empty-state" role="status">
              Cargando la información del consultorio…
            </div>
          ) : error && !settings ? (
            <div className="empty-state">
              <h1>Configura la base de datos</h1>
              <p>
                Aplica las migraciones del directorio supabase/migrations en el orden indicado en
                INSTALAR.md.
              </p>
            </div>
          ) : (
            <Outlet context={profile} />
          )}
        </main>
        <footer className="app-footer">
          Uso interno · Complementario al HIS y a la historia clínica · Fechas en hora de Lima
        </footer>
      </div>
    </div>
  );
}
