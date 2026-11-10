# Diagnóstico del ingreso — 6 de noviembre de 2026

Se comprobó el proyecto utilizado por las variables públicas locales, sin imprimir claves, introducir contraseñas reales ni cambiar la base de datos.

- La aplicación apunta al proyecto esperado zslmltgsuomjlmfvzjgc.
- OPTIONS a /functions/v1/staff-login con orígenes 127.0.0.1:5173, localhost:5173 y 127.0.0.1:4173 devuelve 404, código NOT_FOUND.
- POST con formato inválido, que no autentica a nadie, devuelve también 404 NOT_FOUND.
- No existe una función publicada accesible con ese nombre en ese destino en el momento de la comprobación. No se pudo determinar si se publicó con otro nombre.
- El MCP supabase no está disponible en esta sesión: el servidor responde unknown MCP server. No se confirmó la configuración administrativa ni el historial completo de migraciones.

## Causa del mensaje confuso

El frontend convertía varios errores distintos en configuration_missing y aconsejaba siempre aplicar 004. Se corrigió para distinguir función no encontrada, bloqueo JWT, origen rechazado, red/CORS, configuración interna, límite de intentos y respuesta de ejemplo inesperada. No se muestran detalles internos ni contraseñas.

100 pruebas aprobadas en 12 archivos y build de producción correcto. Las pruebas nuevas reproducen las respuestas del servicio; la ausencia remota se comprobó por HTTP. No se publicó ninguna función en esta revisión.

## Corrección en el panel web

1. Abre https://supabase.com/dashboard/project/zslmltgsuomjlmfvzjgc/functions en tu navegador.
2. Comprueba que la lista contenga exactamente staff-login. El nombre debe llevar guion, sin espacios ni guion bajo.
3. Si falta, selecciona Deploy a new function → Via Editor.
4. Copia TODO supabase/dashboard/staff-login.ts desde VS Code al index.ts del editor web, sustituyendo el ejemplo.
5. En el nombre coloca staff-login y pulsa Deploy function. Espera la confirmación y comprueba que aparezca en la lista.
6. Desactiva Verify JWT with legacy secret para esa función según la guía supabase-panel-web.md. El código usa Supabase Auth para comprobar las credenciales y limita intentos.
7. Conserva APP_ORIGIN con la dirección exacta de tu aplicación. Vuelve a probar desde AgendaCRED.

No repitas migraciones ya aplicadas para resolver un 404 de función. Si, después de publicar, aparece otro error, revisa su mensaje y los registros para tratar esa siguiente causa concreta.
