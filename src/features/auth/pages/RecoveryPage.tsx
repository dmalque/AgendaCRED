import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';

export function RecoveryPage() {
  return (
    <AuthLayout>
      <div className="login-card">
        <div className="access-icon">
          <KeyRound aria-hidden="true" />
        </div>
        <h2>Recuperar tu acceso</h2>
        <p className="form-description">
          Solicita una nueva contraseña al responsable del aplicativo. Puede restablecerla desde
          Personal.
        </p>
        <p>
          Indica tu usuario y confirma tu identidad con el responsable. Recibirás una nueva clave
          que podrás cambiar al ingresar.
        </p>
        <Link className="button primary" to="/ingresar">
          Volver al ingreso
        </Link>
      </div>
    </AuthLayout>
  );
}
