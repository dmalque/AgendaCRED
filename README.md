# Agenda CRED · CSMI El Milagro

Aplicación interna del Centro de Salud Materno Infantil El Milagro. Código Único de IPRESS **00005222** en RENIPRESS, proporcionado por el establecimiento. React + TypeScript + Vite, Supabase y despliegue previsto en Vercel. No reemplaza al HIS ni a la historia clínica.

**Ruta principal en este equipo: `D:\Aplicativos\AgendaCRED`.** El proyecto puede instalarse en otra ruta: los scripts resuelven su ubicación sin rutas absolutas internas.

## Entrega 1: acceso del personal

- Inicio de sesión real con correo y contraseña a través de Supabase Auth.
- Recuperación por correo y actualización de contraseña mediante PKCE.
- Restauración de sesión, cierre de sesión y protección de rutas.
- Perfil habilitado de enfermería o administración, consultado bajo RLS.
- Tema claro fijo, sin selector ni dependencia del tema del sistema.
- Diseño adaptable, etiquetas accesibles, estados de carga y mensajes en español.
- Sin registro público, cuentas ficticias ni acceso de demostración a información protegida.

La ruta `/agenda` es el punto de entrada protegido, todavía sin los módulos de atención, niños o seguimiento. El login es el primer incremento funcional.

## Ejecutar

### Entorno aislado y portable en Windows

El equivalente al entorno virtual en este proyecto React es un **runtime Node.js local** más dependencias locales. No usa Python ni `pip`. `requirements.txt` describe los requisitos; `package.json` y `package-lock.json` fijan las dependencias ejecutables.

```powershell
cd D:\Aplicativos\AgendaCRED
.\scripts\setup.ps1
.\scripts\start.ps1
```

El instalador descarga Node.js **24.16.0** desde nodejs.org y verifica el SHA256 publicado oficialmente antes de extraerlo. Instala Node y npm en `.runtime\node`, usa una caché exclusiva `.npm-cache` y ejecuta `npm ci` en `node_modules`. No modifica la instalación global ni el PATH permanente del equipo. Hace falta internet la primera vez; no es una distribución sin conexión.

Para trabajar desde una consola activada:

```powershell
. .\scripts\activate.ps1
node --version
npm test
npm run build
```

La activación solo afecta a esa consola; ciérrala para salir. Si la política de PowerShell bloquea los scripts, puede usarse `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup.ps1` para esa ejecución, sin cambiar la política permanente del equipo.

### Instalación con Node ya disponible

Alternativamente, usa Node.js 24.16.0 y npm:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Edita `.env.local` con la URL y **publishable key pública** de tu proyecto Supabase:

```dotenv
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Las variables `VITE_` se incluyen en el navegador. Nunca pongas `service_role`, una secret key, contraseñas de base de datos ni credenciales de administración. Sin configuración válida se puede revisar el diseño, pero el botón de ingreso permanece deshabilitado. Reinicia Vite después de cambiar variables.

## Configurar Supabase

1. Crea el proyecto y ejecuta `supabase/migrations/202611060001_staff_profiles.sql` una sola vez desde SQL Editor, o usa migraciones con Supabase CLI.
2. En Authentication → Providers activa Email/Password y **desactiva el registro de usuarios nuevos**. Mantén la confirmación de correo para cualquier futura alta pública; actualmente no se ofrece formulario de registro.
3. Crea las cuentas del personal desde Authentication → Users → Add user. En esta primera entrega se crean desde el panel; no hay gestión de usuarios dentro de la web.
4. Copia el UUID del usuario y crea su perfil mediante SQL Editor. Reemplaza UUID y nombre; no uses el texto de ejemplo literalmente:

```sql
insert into public.staff_profiles (id, full_name, role, active)
values ('UUID-DEL-USUARIO', 'Nombre de la enfermera', 'nurse', true);
-- Para el administrador usa role = 'admin'.
```

5. Configura la Site URL y las Redirect URLs en Authentication → URL Configuration:
   - Desarrollo: `http://127.0.0.1:5173/actualizar-clave`.
   - Producción: `https://TU-DOMINIO/actualizar-clave`.
   - Si usas `localhost`, agrega también esa URL exacta. No mezcles los dos hosts durante la recuperación.
6. Para correo de producción configura un SMTP propio y revisa los límites del proveedor. El servicio de correo incluido puede tener restricciones de destinatarios y frecuencia.
7. Configura la política de contraseñas de Supabase con mínimo 12 caracteres para alinearla al formulario de actualización. Los usuarios existentes pueden iniciar sesión con su contraseña actual; no se impone esa regla al login.

La recuperación PKCE debe abrirse en el mismo navegador que hizo la solicitud. La sesión se intercambia automáticamente con el SDK. Un enlace vencido o abierto sin sesión muestra la opción de solicitar otro.

Para deshabilitar a un trabajador, establece `active = false` y revoca sus sesiones desde Supabase Auth. El control del navegador no sustituye las políticas RLS; cada futura tabla debe comprobar `private.is_active_staff()` en sus políticas. El esquema `private` no debe agregarse a los esquemas expuestos por la Data API.

## Verificación

```powershell
npm run typecheck
npm test
npm run build
```

Las pruebas cubren validación, normalización del correo, errores seguros, visibilidad de contraseña e identificación del establecimiento. Las llamadas de Auth se simulan en pruebas; la aceptación contra Supabase real se realiza después de configurar el proyecto. Consulta `docs/acceptance.md`.

## Estructura

```text
src/
  app/                    # Rutas y composición de la aplicación
  features/
    auth/                 # Sesión, permisos, formularios y servicio de acceso
      components/
      pages/
    agenda/               # Entrada protegida; siguiente incremento
  shared/
    lib/                  # Cliente Supabase
    config/               # Identificación del establecimiento
    ui/                   # Componentes comunes
  styles/                 # Tokens visuales, temas y diseño responsive
  test/                   # Configuración de pruebas
supabase/migrations/      # Esquema y políticas versionadas
docs/                     # Arquitectura, entrega y aceptación
scripts/                  # Preparación, activación, inicio y empaquetado portable
.runtime/                 # Node y npm exclusivos; generado e ignorado por Git
requirements.txt          # Requisitos de sistema e instalación (no pip)
```

## Trasladar a otra computadora

```powershell
.\scripts\package.ps1
```

Se genera un ZIP en `.exports`, con código, scripts, requisitos y lockfile. No incluye `.env.local`, credenciales, `.git`, `node_modules`, cachés ni runtime. Descomprime la carpeta `AgendaCRED` en el destino (por defecto `D:\Aplicativos`), ejecuta `scripts\setup.ps1` y configura las dos variables públicas de Supabase en `.env.local`. No copies la carpeta de dependencias entre sistemas: vuelve a ejecutar `npm ci`.

La estructura del consultorio se centraliza en `src/shared/config/facility.ts`; el código IPRESS se conserva como texto para mantener los ceros iniciales. Esta entrega configura la identificación suministrada y no conecta con RENIPRESS.

## Vercel

1. Sube este repositorio a GitHub e impórtalo en Vercel como proyecto Vite.
2. Comando de build: `npm run build`. Directorio de salida: `dist`.
3. Añade las dos variables públicas en el entorno de producción y vuelve a desplegar.
4. Añade la URL de recuperación de producción a Supabase.
5. Comprueba el acceso directo a `/ingresar`, `/recuperar-clave` y `/agenda` después de refrescar. `vercel.json` contiene el fallback de SPA.

No se ha desplegado ni conectado un proyecto remoto automáticamente. Vercel Hobby tiene restricciones de uso personal/no comercial; revisar el plan antes de operar para una institución. Configura un presupuesto y alertas de consumo según los proveedores.

## Referencias

- [Supabase Auth con React](https://supabase.com/docs/guides/auth/quickstarts/react)
- [Autenticación con contraseñas](https://supabase.com/docs/guides/auth/passwords)
- [RLS en Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Vite en Vercel](https://vercel.com/docs/frameworks/frontend/vite)
