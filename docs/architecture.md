# Arquitectura y forma de trabajo

## Enfoque

Entrega incremental por funcionalidades (vertical slices), con separación entre presentación, reglas de validación y acceso a servicios. Un solo frontend React evita mantener un servidor propio para este primer alcance. Supabase proporciona identidad y PostgreSQL; RLS controla los datos. No se introducen microservicios ni abstracciones de repositorio sin necesidad.

La decisión de usar Vite, en lugar de Next.js, favorece una SPA interna sin necesidad actual de SEO ni renderizado de servidor. React sigue siendo la biblioteca de interfaz. Si aparecen operaciones administrativas privilegiadas, se implementarán en funciones de servidor con validación de identidad y rol, nunca con claves privadas en el navegador.

## Dependencias entre capas

- `app` compone proveedores y rutas; no contiene consultas clínicas.
- Cada `feature` mantiene sus pantallas, reglas y servicios.
- `shared` no importa funcionalidades del negocio.
- Los formularios no conocen claves privadas ni deciden sus propios privilegios.
- Las migraciones de datos se versionan; los cambios manuales del panel deben incorporarse a migraciones posteriores.

## Autenticación y autorización

1. `signInWithPassword` entrega la sesión al SDK.
2. `onAuthStateChange` actualiza el estado de React; el SDK administra refresco y persistencia.
3. `RequireStaff` verifica identidad con `getUser` y consulta el perfil bajo RLS.
4. Sin perfil activo, el usuario no obtiene acceso al módulo de agenda.
5. No se aceptan roles desde campos del formulario, parámetros de URL o metadatos editables del usuario.

Las sesiones se persisten mediante el SDK en el navegador, una decisión propia de esta SPA. No se guardan contraseñas en estado persistente. En equipos compartidos es necesario cerrar sesión. Evitar scripts no confiables y usar HTTPS en producción. Las futuras tablas con datos de menores deben habilitar RLS y exigir personal activo para cada operación, aun si el usuario conserva un JWT anterior a su desactivación.

El administrador aún no tiene una consola de altas: la gestión privilegiada inicial se realiza desde el panel Supabase. El frontend no tiene permisos INSERT/UPDATE/DELETE sobre perfiles.

## UX y accesibilidad

Diseño coherente con la propuesta aprobada: verde clínico, tipografía legible y tema claro fijo. La identificación CSMI El Milagro e IPRESS 00005222 está centralizada en `shared/config/facility.ts`. Los campos tienen etiquetas, autocomplete, indicadores de error y foco visible. Se respeta `prefers-reduced-motion`. El diseño decorativo del login no usa información real y se oculta a lectores de pantalla. Las fuentes tienen alternativas locales; si Google Fonts no está disponible, la pantalla sigue funcionando.

## Flujo de trabajo

Para cada incremento: definir criterio de aceptación → implementar una funcionalidad completa → revisar permisos → ejecutar typecheck, pruebas pertinentes y build → validar con enfermería → desplegar. El método es iterativo inspirado en Kanban, no una afirmación de que existe un proceso Scrum completo.

Tablero sugerido: Pendiente / Definido / En desarrollo / Verificación / Validación de enfermería / Terminado. Una funcionalidad está terminada cuando cumple criterios, estados vacíos y errores, acceso por rol, comprobaciones automáticas y documentación.

## Próximos incrementos

1. Padrón: niño, cuidador, documento provisional y prevención de duplicados.
2. Agenda: horario, enfermera, consultorio, exclusiones de cruces y estados diferenciados.
3. Seguimiento: inasistencias, llamadas, visitas y resolución de pendientes.
4. Reportes: lista imprimible y archivo XLSX acordado con el consultorio.
5. Motor de reglas: versiones normativas, vigencias y confirmación profesional.
6. Administración: usuarios, cupos, auditoría y configuración institucional.

Las restricciones de cruce de horarios también deberán existir en PostgreSQL para resolver concurrencia entre 3–4 enfermeras. El motor normativo no se implementa con las tablas informativas del prototipo; requiere matriz de reglas aprobada, intervalos, condiciones y casos de prueba clínicamente validados.
