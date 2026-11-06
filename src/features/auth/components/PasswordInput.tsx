import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return <div className="input-wrap"><LockKeyhole className="input-icon" size={18} aria-hidden="true" />
    <input {...props} type={visible ? 'text' : 'password'} />
    <button className="password-toggle" type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible}>
      {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
    </button>
  </div>;
}
