# Personal y permisos

## Roles

| Función                                                  | Administrador | Responsable del aplicativo | Enfermería |
| -------------------------------------------------------- | ------------- | -------------------------- | ---------- |
| Agenda, padrón, seguimiento y reportes                   | Sí            | Sí                         | Sí         |
| Finalizar control asignado                               | No            | No                         | Sí         |
| Crear y activar/desactivar enfermería                    | Sí            | Sí                         | No         |
| Cambiar usuario de enfermería                            | Sí            | Sí                         | No         |
| Restablecer contraseña de enfermería                     | Sí            | Sí                         | No         |
| Crear/modificar responsables y administradores           | Sí            | No                         | No         |
| Restablecer claves de otros responsables/administradores | Sí            | No                         | No         |
| Horarios, consultorios, días y cierres                   | Sí            | Sí                         | No         |
| Identidad del establecimiento, reglas CRED y auditoría   | Sí            | No                         | No         |
| Cambiar la propia contraseña desde su sesión             | Sí            | Sí                         | Sí         |

Cada cuenta tiene un único rol. El último administrador activo no puede deshabilitarse ni perder su rol. El responsable no puede cambiar su propio perfil, el de otro responsable ni el de un administrador.

## Crear personal

El administrador abre **Administración → Personal → Crear cuenta**. El responsable utiliza **Gestión del consultorio → Personal → Crear cuenta de enfermería**.

Completa:

- Nombre completo.
- Usuario corto y único, por ejemplo `ana.perez` o `enf01`.
- Rol permitido para quien crea la cuenta.
- Contraseña inicial de 6 a 128 caracteres.

El usuario admite 3 a 24 caracteres, comienza con una letra y permite letras sin tildes, números, punto, guion y guion bajo. Se guarda en minúsculas. No pide correo ni envía mensajes. Las nuevas cuentas se crean directamente desde este panel; no hay registro público ni herramienta de vinculación por UUID en la interfaz.

Entrega las credenciales a su titular. Puede cambiar su clave con **Cambiar mi contraseña**. El sistema no obliga automáticamente al cambio en el primer ingreso. Las contraseñas no se guardan en perfiles ni auditoría y no se muestran después de crear/restablecer.

## Cuentas existentes

La migración 004 asigna alias y conserva UUID, roles y contraseñas. El primero de administración será `admin`, el primero responsable `responsable`, y enfermería recibirá `enf1`, `enf2`, etc. Confirma el listado real con la consulta de INSTALAR.md; no confundas esos alias con cuentas nuevas.

En Personal verás el usuario de cada integrante. **Gestionar perfil** permite cambiarlo según tus permisos; cambiarlo no cambia la contraseña. Dos personas no pueden tener el mismo usuario aunque una cuenta esté inactiva.

## Restablecer una contraseña olvidada

Verifica la identidad de la persona, pulsa **Restablecer contraseña** junto a su cuenta, introduce una nueva clave y entrégasela a su titular. El responsable solo puede hacerlo para enfermería. Un administrador puede hacerlo para otros perfiles. Para la propia clave, usa el cambio desde tu sesión.

La opción **¿Olvidaste tu contraseña?** muestra estas instrucciones; no solicita correo ni envía enlaces. Si perdiste la única cuenta administradora, consulta el procedimiento técnico local de INSTALAR.md.

## Desactivar

En **Gestionar perfil**, desmarca **Acceso activo**. Se conserva el historial y se bloquean las operaciones protegidas en la base de datos. El usuario queda reservado. No reutilices cuentas de personas que dejaron el consultorio.

## Habilitar esta actualización

Aplica las migraciones pendientes en orden, incluida **004**, y despliega **staff-login** e **invite-staff** desde Git Bash siguiendo INSTALAR.md. Reinicia la app. Si tu cuenta ya estaba creada, conserva la contraseña y utiliza el alias asignado. Las pruebas locales no aplican estos cambios en tu Supabase automáticamente.
