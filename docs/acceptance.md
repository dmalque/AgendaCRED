# Aceptación funcional antes del piloto

## Acceso

- Enfermería y administración activas pueden ingresar; cuentas sin perfil o inactivas no acceden.
- Login y recuperación funcionan con las URL exactas de cada entorno.
- Solo administración ve su módulo; intentar abrir su ruta con rol enfermería vuelve a la agenda.
- Cerrar sesión impide consultar módulos protegidos.

## Padrón

- Registrar sin DNI genera un código provisional.
- DNI exige ocho dígitos y conserva ceros iniciales.
- Un documento repetido no crea una segunda ficha.
- Cambiar de CNV/provisional a DNI mantiene el UUID y el historial.
- Editar una revisión antigua no sobrescribe datos más recientes.
- Archivar conserva el historial y exige resolver programaciones pendientes.

## Agenda y control

- Hoy utiliza la fecha de Lima. Día, semana, responsable y contadores corresponden a los filtros.
- Dos usuarios intentando reservar el mismo intervalo no generan cruces de niño, consultorio o profesional.
- Cancelación exige motivo y no se cuenta como inasistencia.
- Llegó no se cuenta como atendida. Guardar borrador tampoco.
- Solo la enfermera asignada guarda el control; finalizar lo cuenta como atendido.
- La fecha real no puede preceder a la cita ni estar en el futuro.
- El próximo control orientativo no reserva horario automáticamente.
- Reprogramar conserva la anterior; si hay cruce, la transacción no cambia nada.
- La autora agrega correcciones al control finalizado, sin reemplazar el original.

## Seguimiento y vacunas

- No asistió crea una tarea. Los pendientes de un control finalizado crean una tarea adicional cuando corresponde.
- Registrar llamada/visita conserva fecha y usuario, resultado y próxima acción.
- Contactar o reprogramar no cuenta como atención realizada.
- Resolver exige motivo y conserva todos los contactos.
- Vacunas: documentado exige fecha válida y fuente; actualizar conserva el antecedente original.
- Sin información se muestra por verificar, no «no vacunado».

## Reportes y administración

- Excel contiene las filas filtradas y conserva DNI e IPRESS como texto.
- Impresión elimina los controles de navegación y muestra el periodo.
- Cierre de un día con citas pendientes exige reprogramarlas primero.
- Enfermería no puede modificar configuración, roles o cierres; responsable solo dispone de gestión limitada.
- No se puede dejar al consultorio sin administradores activos.
- Crear cuentas exige función desplegada, usuario único y administrador o responsable autenticado.
- Auditoría conserva responsable, fecha, operación y valores anteriores/nuevos.

## Integración remota que requiere credenciales

- Aplicar migraciones, activar Realtime y crear las cuentas en un Supabase de prueba.
- Validar sesiones reales, recuperación asistida, creación de cuentas y perfil desactivado con dos navegadores.
- Revisar la matriz CRED con jefatura antes de habilitar propuestas.
- Comprobar autorizaciones institucionales, respaldo de la base y qué cuaderno se reemplaza antes de usar datos reales.

## Personal y responsable del aplicativo

- Administrador crea responsable y enfermería desde Personal; responsable solo enfermería.
- Enfermería no muestra ni accede a gestión; responsable no puede cambiar roles superiores, su propio perfil, reglas CRED ni consultar auditoría.
- Cuenta nueva permite ingreso con usuario/contraseña; no pide correo ni reemplaza contraseñas de cuentas previas.
- Si falla el perfil se intenta revertir exclusivamente la nueva identidad; un fallo de reversión se informa.
- Horarios operativos conservan aprobación normativa y revisiones; cierres exigen reprogramar pendientes.
- Confirmar creación e ingreso reales después de aplicar migración 004 y desplegar ambas funciones.

## Usuarios cortos y claves

- Migración de cuentas existentes conserva identidades y contraseñas; los alias son únicos y editables según rol.
- Login rechaza sintaxis de correo y no expone la identidad subyacente.
- Clave olvidada se restablece desde Personal; responsable solo para enfermería, administrador para otros perfiles.
- No existe envío de enlaces, invitaciones ni formularios de correo.
- Confirmar límites de intentos y uso de tokens en el proyecto remoto antes del piloto.
