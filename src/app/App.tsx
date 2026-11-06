import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RecoveryPage } from '../features/auth/pages/RecoveryPage';
import { UpdatePasswordPage } from '../features/auth/pages/UpdatePasswordPage';
import { RequireStaff } from '../features/auth/RequireStaff';
import { AgendaPage } from '../features/agenda/AgendaPage';
import { facility } from '../shared/config/facility';

export function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    const titles: Record<string, string> = { '/ingresar': 'Ingresar', '/recuperar-clave': 'Recuperar acceso', '/actualizar-clave': 'Nueva contraseña', '/agenda': 'Mi agenda' };
    document.title = `${titles[pathname] || 'Inicio'} · Agenda CRED · ${facility.shortName}`;
  }, [pathname]);
  return <><a className="skip-link" href="#main-content">Ir al contenido</a><Routes>
    <Route path="/ingresar" element={<LoginPage />} />
    <Route path="/recuperar-clave" element={<RecoveryPage />} />
    <Route path="/actualizar-clave" element={<UpdatePasswordPage />} />
    <Route element={<RequireStaff />}><Route path="/agenda" element={<AgendaPage />} /></Route>
    <Route path="*" element={<Navigate to="/ingresar" replace />} />
  </Routes></>;
}
