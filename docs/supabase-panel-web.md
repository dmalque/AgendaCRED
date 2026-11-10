# Publicar desde la web de Supabase

No necesitas iniciar sesión desde Git Bash. Utiliza tu sesión en la página de Supabase. Se realiza al instalar o actualizar las funciones; el personal utiliza después el panel de AgendaCRED.

## 1. Reemplazar el código de ejemplo

En tu proyecto → Edge Functions → Deploy a new function → Via Editor, verás un código que responde Hello. Sustituye TODO ese contenido:

1. Nombre de la función: **staff-login**.
2. En VS Code abre `D:\Aplicativos\AgendaCRED\supabase\dashboard\staff-login.ts`.
3. Selecciona todo el archivo con Ctrl+A y copia con Ctrl+C.
4. En el editor web selecciona el contenido de **index.ts** con Ctrl+A y pega con Ctrl+V.
5. Pulsa **Deploy function**.
6. En la configuración de esa función, desactiva **Verify JWT / Verify JWT with legacy secret** y guarda. El ingreso ocurre antes de tener una sesión; el código verifica la contraseña mediante Supabase Auth y limita intentos.

La copia preparada es autocontenida: no necesitas agregar handler.ts ni carpetas auxiliares. No pegues solamente el index.ts de supabase/functions: ese archivo sí depende de otros archivos del proyecto.

## 2. Publicar la gestión de personal

Repite el procedimiento creando otra función llamada **invite-staff**. Copia TODO `D:\Aplicativos\AgendaCRED\supabase\dashboard\invite-staff.ts` en su index.ts. Si ya existe, abre su editor y reemplaza el contenido; no crees una función con nombre distinto. Publica las actualizaciones.

Desactiva también Verify JWT with legacy secret. El código de gestión sigue exigiendo un token comprobado con Auth y un perfil administrador/responsable activo; esa configuración del gateway no elimina estos controles.

El nombre invite-staff se conserva por compatibilidad. Crea cuentas directamente y restablece claves; no envía invitaciones ni requiere correo del personal.

## 3. Configurar el origen desde la web

En **Edge Functions → Secrets**, añade:

| Name       | Value                 |
| ---------- | --------------------- |
| APP_ORIGIN | http://127.0.0.1:5173 |

Guarda. No añadas barra final. Abre la app con esa misma dirección: localhost es un origen diferente. Si usas preview, cambia a `http://127.0.0.1:4173`; en producción usa el dominio HTTPS final. Se admite un origen por despliegue.

SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY son variables que Supabase proporciona a las funciones. No pegues sus valores en la aplicación React ni dentro del archivo.

## 4. Base de datos e ingreso

En **SQL Editor**, ejecuta las migraciones pendientes en orden. Si aplicaste 001, 002 y 003, falta solo `supabase/migrations/202611060004_usernames.sql`. No repitas las ya aplicadas.

Comprueba tus usuarios con:

```sql
select full_name, username, role, active
from public.staff_profiles
order by role, username;
```

Abre AgendaCRED con ese usuario y su contraseña actual. Crear personal se hace en Administración → Personal o Gestión del consultorio → Personal. La migración conserva las contraseñas de las cuentas existentes.

## Comprobación opcional en el editor web

En Test de staff-login usa POST, añade la cabecera `Origin: http://127.0.0.1:5173` y un cuerpo con usuario/contraseña ficticios. Una respuesta 401 con invalid_credentials indica que el código rechazó el ingreso de prueba. No indica que se hayan probado credenciales reales. Una respuesta 403 suele indicar origen/configuración; 503 exige revisar migraciones, variables y registros. La prueba completa de ingreso debe hacerse desde AgendaCRED.

## Mantener las copias

Los archivos de supabase/dashboard se generan desde los manejadores comprobados de supabase/functions. No los edites por separado. Tras cambiar las fuentes, el desarrollador puede ejecutar localmente `node scripts/build-dashboard-functions.mjs`; esto genera archivos locales y no inicia sesión ni publica nada.
