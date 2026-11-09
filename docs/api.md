# Contratos de datos y operaciones

El frontend consulta tablas mediante Supabase bajo RLS. Para escrituras utiliza exclusivamente:

```ts
supabase.rpc('mutate_cred', { action, p: payload });
```

El servidor comprueba perfil activo, permisos, campos y revisiones antes de modificar registros. Todas las acciones se ejecutan en una transacción. Se recibe `{ id }`, o `{ date }` al modificar un cierre. Un error revierte la operación completa.

| Acción                      | Permiso                      | Resultado                                                                                                     |
| --------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `save_child`                | Personal activo              | Crea o actualiza identidad/cuidador/contacto; documento único.                                                |
| `archive_child`             | Administración               | Archiva/reactiva sin eliminar historial; no permite archivar con citas pendientes.                            |
| `book`                      | Personal activo              | Reserva intervalo para niño, enfermera activa y consultorio.                                                  |
| `reschedule`                | Personal activo              | Conserva la cita anterior y crea otra, con motivo.                                                            |
| `appointment_status`        | Personal activo              | Valida transiciones; exige responsable para iniciar control.                                                  |
| `save_encounter`            | Enfermera asignada           | Guarda borrador o finaliza, con fecha real.                                                                   |
| `correct_encounter`         | Autora del control           | Añade aclaración a un control finalizado.                                                                     |
| `create_followup`           | Personal activo              | Crea tarea de seguimiento.                                                                                    |
| `contact`                   | Personal activo              | Añade contacto y actualiza próxima acción.                                                                    |
| `resolve_followup`          | Personal activo              | Cierra tarea con resolución explícita.                                                                        |
| `save_vaccine`              | Personal activo              | Documenta antecedente o añade una versión nueva.                                                              |
| `save_settings`             | Administración               | Actualiza horario/capacidad y validación de reglas.                                                           |
| `save_operational_settings` | Administración o responsable | Solo horarios, duración, capacidad y días; rechaza campos adicionales.                                        |
| `closed_day`                | Administración o responsable | Cierra o reabre días con comprobación de citas.                                                               |
| `save_staff`                | Administración o responsable | Responsable solo gestiona enfermería; administrador asigna todos los roles. Conserva el último administrador. |

Los formularios envían `revision` para niños, programaciones que cambian de estado, reprogramaciones, borradores, seguimientos y configuración. Una revisión desactualizada devuelve conflicto para recargar, sin sobrescribir.

## Identificación y fechas

- Los documentos y el código IPRESS son cadenas, nunca números.
- DNI exige ocho dígitos; provisional genera un código independiente del UUID interno.
- Las reservas usan `timestamptz` en UTC y se muestran en Lima.
- Nacimiento, fecha real, próximos controles y feriados usan `date` sin conversión de zona.
- La fecha real no puede ser anterior a la programación ni posterior a hoy.
- El informe permite elegir fecha programada o fecha real de control.

## Estados

`scheduled → arrived → in_progress → completed`. También se puede finalizar directamente desde `arrived` al guardar un control final. `no_show`, `cancelled` y `rescheduled` conservan el registro anterior. Llegada y borrador no se cuentan como atención realizada.

`followups`: `open → contacted → resolved`; un intento sin respuesta no cierra el seguimiento. Resolver una tarea no altera atenciones ni vacunas.

`vaccine_records`: `unverified`, `pending` o `documented`. Documentado exige fecha y fuente. Las actualizaciones usan `supersedes_id`, sin borrar originales.

## Acceso por usuario

`POST /functions/v1/staff-login` recibe `{username,password}` sin sesión previa. Valida origen, formato y límites persistentes; resuelve la identidad internamente y autentica contra Supabase Auth. Devuelve `{access_token,refresh_token}` o 401 uniforme. 429 indica límite de intentos; 503, configuración o servicio no disponible. No añade campos de correo ni perfil a la respuesta. Los tokens mantienen las claims estándar de Supabase, incluida la identidad de su titular. La sesión se guarda mediante el SDK, como en el acceso estándar.

## Gestión de personal

`POST /functions/v1/invite-staff` conserva el nombre técnico anterior. Creación: `{username,password,full_name,role}`; devuelve 201 con `{id}`. Requiere token verificado y administrador o responsable activo. El responsable solo crea enfermería. Alias: 3 a 24 caracteres, comienza con letra y permite a-z, 0-9, punto, guion y guion bajo; se normaliza a minúsculas. Contraseña: 6 a 128 caracteres.

La nueva identidad utiliza un identificador técnico opaco y confirmado en Auth, sin envío de correo. El perfil se guarda con la sesión del solicitante mediante RPC y, si falla, se intenta revertir solo la identidad recién creada. No se reemplazan contraseñas por un usuario duplicado.

Restablecimiento: `{action:'reset_password',id,password}`; devuelve `{id}`. Autoriza mediante `mutate_cred('authorize_password_reset',{id})` antes de modificar Auth. El responsable solo restablece enfermería; el administrador también otros perfiles. El solicitante usa el cambio normal para su propia contraseña. No se devuelven ni auditan contraseñas.

La migración 004 conserva privados los dos despachadores anteriores y mantiene el único RPC público comprobado. `take_staff_login_attempt` solo es ejecutable por service_role; los clientes anónimos o autenticados no pueden invocarlo. No expongas el esquema private en Data API. Consulta INSTALAR.md para desplegar ambas funciones.

## Auditoría y privacidad

`audit_events` se genera en el servidor y solo es consultable por administración. Las exportaciones ordinarias no incluyen observaciones clínicas ni teléfonos. Los datos de prueba no se cargan en producción; PGlite vive exclusivamente en las pruebas locales y no se usa como base de la aplicación.
