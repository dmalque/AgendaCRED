# Arquitectura y metodología

Aplicación interna de una sola IPRESS: CSMI El Milagro (00005222). React + TypeScript, componentes funcionales, rutas por módulo con carga diferida y servicios separados de las pantallas. El frontend no contiene claves privilegiadas.

## Desarrollo por incrementos verificables

Cada funcionalidad recorre definición → implementación vertical → pruebas de reglas y permisos → revisión con enfermería → despliegue. Se evita introducir microservicios o un servidor propio sin necesidad. Las migraciones SQL son parte del código de la funcionalidad.

## Datos y operaciones

- `staff_profiles`: usuarios autorizados y roles.
- `facility_settings`, `closed_days`: disponibilidad y validación local de reglas.
- `children`: identidad, documento, cuidador y contacto, con archivo sin borrado.
- `appointments`: reserva, duración, responsable, consultorio, estado y vínculo a la programación anterior.
- `encounters`, `encounter_corrections`: registro breve con fecha real y correcciones anexas.
- `followups`, `followup_contacts`: tareas y contactos con cierre explícito.
- `vaccine_records`: versiones de antecedentes documentados, pendientes o por verificar.
- `audit_events`: valores anteriores/nuevos y autor de cada operación.

Las tablas son de lectura para `authenticated` bajo RLS. Las escrituras pasan por `mutate_cred`, SECURITY DEFINER con `search_path` vacío, comprobación de perfil activo, roles y validación de transición en cada acción. Se revoca EXECUTE a PUBLIC/anon. El servidor genera UUID, fechas y autor; no toma un autor del formulario.

La creación de cuentas se ejecuta en Edge Functions, verifica el token con Supabase Auth y exige administrador o responsable activo. El responsable solo gestiona enfermería. La identidad se crea en Auth con un identificador interno opaco y contraseña inicial y el perfil se guarda mediante RPC con la sesión del solicitante para comprobar nuevamente autorización y auditar. Si falla, se intenta revertir la identidad recién creada. Las credenciales privilegiadas permanecen en el servidor.

La migración 003 agrega `manager`, conserva perfiles y separa configuración operativa de reglas CRED. Solo el administrador asigna roles superiores, cambia la identidad del establecimiento, aprueba reglas y consulta auditoría. La implementación clínica anterior queda privada con ejecución revocada a clientes.

## Acceso por usuario sin correo

La migración 004 agrega alias únicos y normalizados, preservando identidades y contraseñas existentes. El ingreso llama a `staff-login`; el servidor resuelve internamente el alias a la identidad de Supabase Auth y verifica la contraseña con un cliente no privilegiado aislado por solicitud. Solo devuelve tokens de sesión, sin direcciones ni datos del perfil. El navegador establece la sesión con `setSession`. No existe búsqueda anónima de correos o perfiles.

Supabase Auth requiere email o teléfono para su proveedor de contraseña. Las nuevas cuentas reciben un identificador técnico aleatorio bajo `accounts.agendacred.invalid`, que no es un buzón y no se muestra al personal. Las cuentas existentes conservan su identidad original. No se envían invitaciones, verificaciones ni enlaces de recuperación desde la aplicación. No hay registro público ni vinculación por UUID en la interfaz.

El límite de acceso reside en PostgreSQL y solo lo invoca el servidor: 10 intentos por usuario y 60 globales cada 5 minutos, incluidos los correctos. Se responde de forma uniforme ante usuario inexistente, inactivo o clave incorrecta. Los tokens de sesión se devuelven con Cache-Control no-store.

El restablecimiento desde Personal verifica el solicitante y autoriza el destino mediante RPC antes de actualizar Auth. Responsable solo gestiona enfermería; administrador gestiona otros perfiles. Se registra PASSWORD_RESET_REQUEST sin contraseña; los registros de Auth contienen el cambio efectivo. No se promete revocación inmediata de JWT ya emitidos. El propietario técnico dispone de un script local e interactivo para recuperar únicamente un administrador existente si pierde su sesión.

## Concurrencia

Exclusiones GiST con intervalos `[inicio, fin)` impiden cruces, incluyendo solapamientos parciales. Se permiten turnos contiguos. Niño, profesional y consultorio tienen restricciones separadas.

Reprogramar cambia el estado de la cita anterior e inserta una nueva en una transacción; si falla el nuevo horario, la anterior permanece intacta. Las revisiones en registros editables detectan cambios concurrentes. El último administrador activo no se puede deshabilitar ni degradar, con bloqueo transaccional para evitar carreras entre administradores.

## Interfaz y carga

Tema claro fijo, formularios con validación nativa, errores en español y diálogos accesibles. Las tablas admiten desplazamiento horizontal y las listas se adaptan a móvil. Impresión elimina navegación y botones. Excel se carga solo al exportar y conserva identificadores como texto.

El proveedor carga conjuntos paginados y actualiza tras operaciones propias, cambios Realtime y al volver a la ventana. Si Realtime falla, usa consulta de respaldo cada minuto. El límite explícito de 100000 filas por conjunto detiene la carga en lugar de truncar silenciosamente; para volúmenes mayores se debe pasar a paginación y búsqueda totalmente en servidor. Las pantallas filtran el conjunto cargado para el consultorio pequeño previsto.

## Límites clínicos

Las sugerencias CRED parten del calendario de referencia y del último control realizado. Permanecen deshabilitadas hasta revisión local, nunca confirman citas y no generan controles neonatales sin revisión de las ventanas y el alta. Cambiar una etiqueta normativa no implementa una nueva norma. Las vacunas solo documentan antecedentes y fuentes. No se implementa historia clínica integral, puntajes de tamizaje, prescripción, RENIEC ni sincronización HIS.

## Pruebas

Vitest + Testing Library para formularios y búsqueda; pruebas de fechas y XLSX; PGlite para ejecutar las cuatro migraciones y verificar políticas y transacciones de PostgreSQL. Los manejadores HTTP de acceso y personal se comprueban con servicios inyectados y simulados. Las pruebas locales no verifican el gateway de Supabase, Realtime remoto ni el despliegue de Edge Functions. Esos recorridos deben confirmarse en un proyecto de prueba antes del piloto real.
