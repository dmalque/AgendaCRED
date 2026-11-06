# Aceptación del primer incremento

## Local, sin Supabase

- La URL inicial lleva a `/ingresar`.
- El aviso explica que falta configurar la conexión; no hay ingreso ficticio.
- El tema es siempre claro, incluso si el sistema o una preferencia anterior estaban en oscuro.
- Aparece CSMI El Milagro y el código IPRESS 00005222.
- En pantalla de 320 px el formulario no desborda horizontalmente.
- Mostrar contraseña no envía el formulario.

## Con Supabase configurado

- Credenciales incorrectas muestran un mensaje seguro, sin detalles internos.
- Correo y contraseña válidos de una enfermera activa permiten acceder a `/agenda`.
- Un administrador activo también puede acceder y ve su rol correcto.
- Una cuenta sin perfil o con `active = false` no obtiene acceso.
- Actualizar la página restaura la sesión; salir devuelve al login.
- Acceder directamente a `/agenda` sin sesión redirige al login.
- Solicitar recuperación muestra un mensaje genérico, exista o no el correo.
- Abrir el enlace de recuperación en el mismo navegador permite cambiar la contraseña.
- La contraseña nueva debe coincidir en ambos campos y tener al menos 12 caracteres.
- Enlace vencido o inválido ofrece solicitar otro; no simula éxito.
- Después de cambiar contraseña, confirmar que la nueva permite ingresar.
- Cuando Supabase no está accesible, mostrar error o permitir reintento sin conceder acceso.

## RLS, mediante Data API con credenciales de usuario

- La clave pública anónima no puede consultar perfiles.
- Un usuario solo puede leer su propio perfil.
- Ni una enfermera ni el administrador pueden alterar sus roles desde la API pública.
- No es posible activar un perfil desde el navegador.

## Antes del piloto real

Estas comprobaciones requieren un proyecto Supabase y usuarios de prueba; no se sustituyen por mocks. No cargar datos reales de menores durante esta entrega de acceso. Validar autorización institucional, copias de seguridad, política de acceso y alcance del piloto antes de implementar y usar módulos con datos reales.
