// Local, interactive recovery for the project owner. Never creates staff accounts.
import { createInterface } from 'node:readline/promises';
import { createClient } from '@supabase/supabase-js';

if (process.argv.includes('--help')) {
  console.log('Uso en Git Bash: source scripts/activate.sh && node scripts/recover-admin.mjs');
  console.log(
    'Restablece la contraseña de un administrador activo existente. Solicita usuario, clave privilegiada y contraseña sin guardarlas ni mostrarlas.',
  );
  process.exit(0);
}
if (!process.stdin.isTTY || !process.stdin.setRawMode) {
  console.error(
    'Abre una terminal interactiva Git Bash en VS Code para ejecutar esta recuperación.',
  );
  process.exit(1);
}
function secret(question) {
  return new Promise((resolve, reject) => {
    let value = '';
    process.stdout.write(question);
    const finish = (error) => {
      process.stdin.off('data', read);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    };
    const read = (chunk) => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\u0003') {
          finish(new Error('Operación cancelada.'));
          return;
        }
        if (char === '\r' || char === '\n') {
          finish();
          return;
        }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else if (char >= ' ') value += char;
      }
    };
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', read);
  });
}
try {
  try {
    process.loadEnvFile('.env.local');
  } catch {
    /* Ask for the public URL if absent. */
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const url =
    process.env.VITE_SUPABASE_URL ||
    (await rl.question('URL del proyecto Supabase (https://...supabase.co): ')).trim();
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
    rl.close();
    throw new Error('Utiliza la URL HTTPS de tu proyecto Supabase.');
  }
  const username = (await rl.question('Usuario del administrador existente: '))
    .trim()
    .toLowerCase();
  rl.close();
  const key = await secret('Clave secret o service_role del proyecto (oculta): ');
  const password = await secret('Nueva contraseña de 6 a 128 caracteres (oculta): ');
  const confirmation = await secret('Repite la nueva contraseña (oculta): ');
  if (password.length < 6 || password.length > 128 || password !== confirmation)
    throw new Error('Las contraseñas deben coincidir y tener 6 a 128 caracteres.');
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile, error } = await admin
    .from('staff_profiles')
    .select('id,role,active')
    .eq('username', username)
    .single();
  if (error || profile?.role !== 'admin' || !profile.active)
    throw new Error(
      'No se encontró un administrador activo con ese usuario o la clave no tiene permisos.',
    );
  const { error: resetError } = await admin.auth.admin.updateUserById(profile.id, { password });
  if (resetError)
    throw new Error(
      'Supabase no permitió cambiar la contraseña. Revisa su política y la clave del proyecto.',
    );
  console.log(`Contraseña actualizada para ${username}. Ingresa desde la aplicación.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'No se pudo recuperar el acceso.');
  process.exitCode = 1;
}
