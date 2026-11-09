# Instalar y usar AgendaCRED con Git Bash

Carpeta principal: **D:\Aplicativos\AgendaCRED**. Abre esa carpeta completa en VS Code. El proyecto selecciona Git Bash para terminales nuevas.

## 1. Preparar el entorno

```bash
cd /d/Aplicativos/AgendaCRED
bash scripts/setup.sh
```

Solo al instalar o actualizar dependencias. Descarga Node local en `.runtime/node`, verifica SHA256 e instala con `npm ci`. No modifica Node global ni sobrescribe `.env.local` existente.

## 2. Conectar Supabase

Configura `.env.local` con las dos variables públicas:

```dotenv
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICA
```

Nunca pongas una clave secret o service_role en variables VITE_. Data API debe estar habilitada; conserva desactivada la exposición automática de nuevas tablas y activada RLS automática. Mantén deshabilitado el registro público en Authentication. La aplicación no ofrece registro público, invitaciones ni recuperación por correo.

## 3. Aplicar las migraciones

En Supabase → SQL Editor ejecuta una sola vez, en este orden:

1. `supabase/migrations/202611060001_staff_profiles.sql`
2. `supabase/migrations/202611060002_agenda_modules.sql`
3. `supabase/migrations/202611060003_manager_accounts.sql`
4. `supabase/migrations/202611060004_usernames.sql`
5. `supabase/migrations/202611090005_consistency.sql`
6. `supabase/migrations/202611090006_followup_nurses.sql`
7. `supabase/migrations/202611090007_room_aliases.sql`

**Si ya aplicaste 001 a 005, ejecuta solo 006. Si tienes hasta 004, ejecuta 005 y luego 006. Si tienes hasta 003, ejecuta 004 y luego 005. No repitas las anteriores.** Si 003 también está pendiente, aplica 003 y luego 004. Todas forman parte del código versionado; el flujo CLI también permite `supabase db push` si sus historiales ya coinciden.

La migración 004 conserva cuentas, UUID y contraseñas existentes. Asigna alias iniciales: `admin`, `admin2`, etc.; `responsable`, `responsable2`, etc.; `enf1`, `enf2`, etc. Para comprobar cuál corresponde a cada persona:

```sql
select full_name, username, role, active
from public.staff_profiles
order by role, username;
```

El alias se puede cambiar después desde Personal.

### Primera cuenta administradora (solo instalación nueva)

Primero crea tu cuenta de propietario en Supabase → Authentication → Users con una contraseña y cuenta confirmada. Esta operación inicial puede pedir un identificador de correo, que no se utilizará para ingresar a la web ni para enviar mensajes. Copia su UUID real y ejecuta:

```sql
insert into public.staff_profiles(id, full_name, username, role, active)
values ('UUID-REAL-DEL-USUARIO', 'Nombre del administrador', 'admin', 'admin', true);
```

Esto es solo el arranque técnico. El personal se crea desde el panel de la aplicación, con usuario corto y contraseña. Si tu cuenta ya tiene perfil administrador, no crees otra ni repitas el INSERT.

## 4. Desplegar las funciones de acceso y personal

**Para hacerlo desde el navegador, sin iniciar sesión desde Git Bash, sigue [Publicar desde el panel web](docs/supabase-panel-web.md).** Los archivos completos para pegar están en `supabase/dashboard/staff-login.ts` y `supabase/dashboard/invite-staff.ts`. Usa esa guía en lugar de los comandos de esta sección.

### Alternativa opcional mediante CLI

En Git Bash, dentro del proyecto:

```bash
source scripts/activate.sh
npx supabase login
npx supabase secrets set APP_ORIGIN=http://127.0.0.1:5173 --project-ref zslmltgsuomjlmfvzjgc
npx supabase functions deploy staff-login --project-ref zslmltgsuomjlmfvzjgc --no-verify-jwt
npx supabase functions deploy invite-staff --project-ref zslmltgsuomjlmfvzjgc --no-verify-jwt
```

Las funciones deben desplegarse desde esta carpeta: la CLI incluye sus archivos `_shared` y `handler.ts`. No copies únicamente index.ts en el editor web.

`staff-login` acepta usuario y contraseña, limita intentos y utiliza Supabase Auth para validarlos. `invite-staff` conserva un nombre técnico anterior, pero ahora solo crea cuentas directamente o restablece contraseñas; no envía invitaciones. Comprueba el token, el perfil y los permisos de cada solicitante. Las claves privilegiadas permanecen en Supabase.

`--no-verify-jwt` permite el ingreso previo a tener sesión y la verificación de tokens dentro del código. La gestión de personal siempre exige sesión validada y permisos. No se permite consultar correos o usuarios anónimamente mediante SQL.

`APP_ORIGIN` debe coincidir con el origen exacto de la web, sin ruta ni barra final. Para preview usa `http://127.0.0.1:4173`; para producción `https://TU-DOMINIO`. Un despliegue permite un origen. Elige 127.0.0.1 o localhost consistentemente; son orígenes diferentes.

## 5. Iniciar y entrar

```bash
bash scripts/start.sh
```

Abre **http://127.0.0.1:5173**. Ingresa con tu **usuario corto** y contraseña actual. Para detener la app pulsa Ctrl+C. Una terminal nueva de VS Code también permite `npm run dev`.

Para crear enfermeras o responsables, sigue [Personal y permisos](docs/personal.md). Cada cuenta tiene un único rol y solo enfermería recibe controles para finalizarlos.

## 6. Recuperar contraseñas

La persona que olvida su clave solicita ayuda al responsable. En **Personal → Restablecer contraseña**, el responsable solo puede restablecer enfermería. El administrador también puede restablecer otras cuentas responsables o administradoras. Para la contraseña propia utiliza **Cambiar mi contraseña** desde una sesión abierta.

Si perdiste la única cuenta administradora y no tienes sesión, como propietario técnico del proyecto puedes ejecutar localmente:

```bash
source scripts/activate.sh
node scripts/recover-admin.mjs
```

Solicita el usuario administrador existente, una clave secret o service_role del proyecto y una nueva contraseña. Las claves se introducen ocultas y no se guardan. Este script no crea cuentas ni asigna roles: solo permite recuperar un administrador activo existente. No está incluido en el frontend ni se ejecuta automáticamente. Utiliza una terminal interactiva Git Bash de VS Code.

El restablecimiento desde Personal registra una solicitud con actor y destinatario, sin contraseña. La modificación efectiva también queda en los registros de Auth. No se promete cierre inmediato de todos los JWT ya emitidos.

## 7. Probar, compilar y trasladar

```bash
bash scripts/check.sh
```

Para preview:

```bash
source scripts/activate.sh
npm run build
npm run preview -- --port 4173
```

Después de cambiar código, vuelve a compilar si usas preview. Para desarrollar usa start.sh.

```bash
bash scripts/package.sh
```

El ZIP se genera en `.exports`, sin secretos, `.env.local`, runtime, datos ni node_modules. En otro equipo descomprime, ejecuta setup.sh y configura tus variables. No es respaldo de la base de datos.

## 8. Vercel

Framework Vite, build `npm run build`, salida `dist`. Configura las dos variables públicas. Despliega las dos funciones en Supabase y cambia APP_ORIGIN al dominio final. No necesitas configurar un proveedor de correo para los flujos de esta aplicación.
