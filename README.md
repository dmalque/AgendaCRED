# Agenda CRED · CSMI El Milagro

Agenda interna del Centro de Salud Materno Infantil El Milagro, IPRESS **00005222**. React + TypeScript + Vite, Supabase y Vercel. Tema claro fijo. No sustituye el HIS ni la historia clínica institucional.

**Carpeta principal: `D:\Aplicativos\AgendaCRED`.** Abre esa carpeta completa en VS Code y utiliza **Git Bash**.

## Iniciar la aplicación

En Git Bash ejecuta:

```bash
cd /d/Aplicativos/AgendaCRED
bash scripts/start.sh
```

Abre **http://127.0.0.1:5173**, deja la terminal abierta y detén la aplicación con **Ctrl+C**. El script selecciona el Node del proyecto automáticamente: no debes activar nada previamente.

VS Code está configurado para abrir Git Bash y utilizar el Node local. Después de abrir una **terminal nueva** también puedes ejecutar directamente:

```bash
npm run dev
```

**Primera instalación o conexión con Supabase: sigue [INSTALAR.md](INSTALAR.md).** La configuración existente de `.env.local` se conserva.

Para publicar las funciones sin iniciar sesión desde la terminal, utiliza [la guía del panel web de Supabase](docs/supabase-panel-web.md). Los archivos completos para copiar están en `supabase/dashboard`.

## Comandos en Git Bash

| Tarea                                             | Comando                   |
| ------------------------------------------------- | ------------------------- |
| Instalar en otro equipo o actualizar dependencias | `bash scripts/setup.sh`   |
| Iniciar para desarrollar                          | `bash scripts/start.sh`   |
| Comprobar formato, pruebas y build                | `bash scripts/check.sh`   |
| Crear ZIP trasladable                             | `bash scripts/package.sh` |

Si trabajas en una terminal Git Bash externa a VS Code y quieres ejecutar comandos npm manualmente:

```bash
source scripts/activate.sh
npm test
npm run build
npm run preview -- --port 4173
```

Esto solo selecciona el Node local en esa terminal. No modifica la configuración global ni inicia ningún otro intérprete.

## Módulos

- Acceso: usuario corto, recuperación asistida desde Personal, nueva contraseña, perfiles activos y cierre de sesión.
- Padrón: documentos, datos del niño y del cuidador, búsqueda y archivo.
- Agenda: día/semana, programación, llegada, cancelación y reprogramación sin cruces.
- Control breve: borrador, fecha real, finalización, acuerdos, pendientes y correcciones anexas.
- Seguimiento: inasistencias, llamadas, visitas, próxima acción y resolución.
- Vacunas: antecedentes documentados, pendientes, fuente y versiones anteriores.
- Reportes: fecha programada o real, impresión y XLSX.
- Administración: horarios, consultorios, cierres, creación de cuentas y auditoría.
- Responsable del aplicativo: enfermería y disponibilidad, con permisos limitados.

Crear cuentas desde la web requiere aplicar las migraciones pendientes hasta 004 y desplegar `staff-login` e `invite-staff`. El personal ingresa con usuario corto y contraseña; las claves olvidadas se restablecen desde Personal. No pide correo ni envía enlaces. Consulta [Personal y permisos](docs/personal.md). Las propuestas CRED permanecen deshabilitadas hasta revisión local y no confirman citas ni indican vacunas automáticamente.

## Organización

```text
src/app/                 Rutas y estructura de trabajo
src/features/            Acceso, niños, agenda, seguimiento, reportes y administración
src/shared/              Tipos, datos, fechas y componentes comunes
src/styles/              Tema claro y diseño adaptable
src/test/                Pruebas locales, incluyendo PostgreSQL
supabase/migrations/     Esquema, permisos y transacciones
supabase/functions/      Acceso por usuario y gestión de cuentas en servidor
scripts/*.sh             Herramientas para Git Bash
scripts/package.mjs      ZIP multiplataforma mediante Node.js
.vscode/settings.json    Terminal Git Bash y Node local para este proyecto
.runtime/node/           Node.js y npm exclusivos (generados)
REQUISITOS.txt         Requisitos; no se instala con pip
package-lock.json        Dependencias reproducibles
```

El instalador usa `curl`, `sha256sum` y `unzip` incluidos en Git for Windows. Descarga Node.js desde nodejs.org y verifica el SHA256 oficial. Las dependencias se instalan con `npm ci`; la caché es local en `.npm-cache`.

El ZIP no contiene claves, `.env.local`, datos clínicos, runtime ni dependencias generadas. En otro equipo descomprime y ejecuta `bash scripts/setup.sh`. La base de datos requiere su propio respaldo.

Documentación: [instalación](INSTALAR.md), [manual](docs/manual.md), [arquitectura](docs/architecture.md), [aceptación](docs/acceptance.md), [validación](docs/validation.md).
