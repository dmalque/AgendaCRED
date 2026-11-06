# Verificacion actual - CSMI El Milagro

6 de noviembre de 2026. Ruta principal: D:\Aplicativos\AgendaCRED.

- Node.js 24.16.0 descargado desde nodejs.org y SHA256 comprobado por setup.ps1.
- node.exe y npm.cmd resueltos desde D:\Aplicativos\AgendaCRED\.runtime\node.
- npm ci completado usando node_modules y cache exclusivos del proyecto.
- Build de produccion correcto desde la ruta nueva.
- 9 pruebas aprobadas en 2 archivos desde la ruta nueva.
- Login revisado en navegador: CSMI El Milagro e IPRESS 00005222.
- Tema claro fijo comprobado con color-scheme light y sin controles de tema.
- Captura actual: docs/screenshots/login-el-milagro.png. Las otras capturas son historicas de la propuesta anterior.
- ZIP de codigo verificable, sin .env.local, .git, node_modules, cache ni runtime.

Pendiente: variables reales de Supabase, migracion remota y cuentas del personal. La identidad institucional usa los datos proporcionados por el usuario; no consulta RENIPRESS.

El build mantiene un aviso de bundle superior a 500 kB sin comprimir; no impide la compilacion. Las pruebas de autenticacion usan mocks y no sustituyen la validacion contra Supabase real.
