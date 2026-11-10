# Verificación de AgendaCRED 0.4.0

## Comprobaciones locales

93 pruebas en 12 archivos, formato correcto y build de producción con TypeScript estricto y Vite. Las comprobaciones utilizan Git Bash y Node local del proyecto.

- PGlite ejecuta las migraciones 001 a 003, crea perfiles existentes y aplica 004 para verificar una actualización real del esquema. Comprueba alias únicos, normalización y conservación de UUID/roles; una colisión revierte toda la modificación del perfil.
- Mantiene pruebas RLS, duplicados, revisiones, cruces, reprogramación atómica, controles, seguimientos, vacunas y auditoría.
- Permisos: responsable gestiona solo enfermería y horarios; no modifica responsables, administradores, normativa ni su propio perfil. Se conserva al último administrador activo.
- Restablecimiento: autorización del destino, bloqueo de enfermería y perfiles superiores, auditoría de solicitud sin credenciales.
- Login: formato de usuario corto, rechazo de sintaxis de correo, tokens sin caché, fallos uniformes, límites persistentes y prohibición de invocar el limitador desde clientes.
- SDK del navegador: establece sesión solo después de una autenticación válida; no usa enlaces por correo.
- UI: creación sin campo de correo, edición de usuario, restablecimiento desde Personal y campos operativos limitados.
- Manejadores HTTP reales con servicios externos simulados: tokens, origen, roles, validaciones, compensación de identidad nueva y fallo de compensación.
- Se mantienen pruebas de fechas de Lima, propuestas CRED, reportes y escritura/lectura XLSX.
- Script de recuperación técnica: sintaxis y ayuda local verificadas sin acceder a Supabase ni introducir secretos. La operación privilegiada no se ejecuta durante las pruebas.

## Verificación remota pendiente

Esta actualización no aplica SQL remoto, no despliega funciones ni modifica SMTP u otras opciones del dashboard. La aplicación elimina los flujos de correo y su dependencia de un proveedor de envío. Aplica 004 después de las anteriores, despliega staff-login e invite-staff y confirma ingreso/creación/restablecimiento con usuarios reales. Se conserva .env.local sin leer ni distribuir sus valores.

Los servicios externos se simulan en las pruebas HTTP. Las pruebas SQL emulan la identidad de Auth en PGlite. No sustituyen una prueba de extremo a extremo con Supabase Auth, gateway, Realtime y Vercel.

## Límites

Solo enfermería recibe controles para finalizarlos; cada cuenta tiene un único rol. El cambio de contraseña inicial está disponible, sin obligación automática al primer ingreso. Un restablecimiento no garantiza que desaparezcan inmediatamente JWT ya emitidos. Los límites actuales admiten 10 intentos por usuario y 60 globales cada 5 minutos, incluidos accesos correctos.

Las propuestas CRED requieren revisión local; no hay curvas clínicas, prescripción ni esquemas vacunales automáticos. Excel sigue cargándose de forma diferida. La advertencia Vite de chunks de más de 500 kB no impide la compilación.

## Traslado

El empaquetado excluye secretos, datos, runtime y dependencias. Los scripts Git Bash y el instalador con comprobación SHA256 se conservan; el script nuevo solo sirve para recuperar una cuenta administradora existente desde una terminal local interactiva.
