import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RecoveryPage } from '../features/auth/pages/RecoveryPage';
import { UpdatePasswordPage } from '../features/auth/pages/UpdatePasswordPage';
import { RequireStaff } from '../features/auth/RequireStaff';
import { Workspace } from './Workspace';
import { facility } from '../shared/config/facility';
const AgendaPage = lazy(() => import('../features/agenda/AgendaPage'));
const ChildrenPage = lazy(() => import('../features/children/ChildrenPage'));
const ChildProfilePage = lazy(() => import('../features/children/ChildProfilePage'));
const FollowupPage = lazy(() => import('../features/followup/FollowupPage'));
const ReportsPage = lazy(() => import('../features/reports/ReportsPage'));
const AdminPage = lazy(() => import('../features/admin/AdminPage'));
export function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    const titles: Record<string, string> = {
      '/ingresar': 'Ingresar',
      '/recuperar-clave': 'Recuperar acceso',
      '/actualizar-clave': 'Nueva contraseña',
      '/agenda': 'Mi agenda',
      '/ninos': 'Niños y niñas',
      '/seguimiento': 'Seguimiento',
      '/reportes': 'Reportes',
      '/administracion': 'Administración',
    };
    document.title = `${titles[pathname] || 'Ficha del niño'} · Agenda CRED · ${facility.shortName}`;
  }, [pathname]);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Ir al contenido
      </a>
      <Suspense
        fallback={
          <div className="full-status" role="status">
            Abriendo módulo…
          </div>
        }
      >
        <Routes>
          <Route path="/ingresar" element={<LoginPage />} />
          <Route path="/recuperar-clave" element={<RecoveryPage />} />
          <Route path="/actualizar-clave" element={<UpdatePasswordPage />} />
          <Route element={<RequireStaff />}>
            <Route element={<Workspace />}>
              <Route path="/agenda" element={<AgendaPage />} />
              <Route path="/ninos" element={<ChildrenPage />} />
              <Route path="/ninos/:id" element={<ChildProfilePage />} />
              <Route path="/seguimiento" element={<FollowupPage />} />
              <Route path="/reportes" element={<ReportsPage />} />
              <Route path="/administracion" element={<AdminPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/agenda" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
