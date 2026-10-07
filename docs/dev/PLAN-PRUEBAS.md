# Plan de pruebas (informe v3, secciones 5.3 y 10)

Fuente: matriz de pruebas **CP-01 … CP-22** de la v3.0, recodificada contra el
catálogo vigente. Cada caso queda ligado a su RF (trazabilidad RF ↔ CU ↔ CP).

**Leyenda:** ⬜ pendiente · 🔧 en curso · ✅ aprobada
**Nivel:** U = unitaria · I = integración (API + BD) · S = sistema (flujo completo) · A = aceptación

| CP | RF | Prueba | Nivel | Fase | Estado |
|---|---|---|---|---|---|
| CP-01 | RF-01 | Registrar un estudiante Free → cuenta creada con hash y redirección a login | I | 1 | ✅ |
| CP-02 | RF-02 | Login con credenciales válidas → panel del rol | I | 1 | ✅ |
| CP-03 | RF-02 | Login con contraseña incorrecta → mensaje genérico (sin revelar motivo) | I | 1 | ✅ |
| CP-04 | RF-02 | Cerrar sesión → sesión invalidada y sin datos protegidos al volver atrás | S | 1 | ✅ |
| CP-05 | RF-03 | Recuperar contraseña → token por correo, expira y permite clave nueva | I | 1 | ✅ |
| CP-06 | RF-04 | Editar perfil propio → cambios persistidos | I | 1 | ✅ |
| CP-07 | RF-05 | Crear/editar institución → visible en el listado del Superadmin | I | 2 | ✅ |
| CP-08 | RF-06 | Crear Administrador de Institución → rol y asociación correctos | I | 2 | ✅ |
| CP-09 | RF-07 | Matricular estudiante en la sede → vinculado y listado | I | 4 | ✅ |
| CP-10 | RF-16 | Asignar evento al calendario de ensayos → visible solo en su sede | I | 4 | ✅ |
| CP-11 | RF-08 | Publicar lección en un eje → disponible para estudiantes | I | 2 | ✅ |
| CP-12 | RF-09 | Crear ejercicio con 4–5 alternativas → una sola correcta | I | 2 | ✅ |
| CP-13 | RF-10 | Parametrizar simulacro → 65 preguntas y límite 140 min | I | 2 | ✅ |
| CP-14 | RF-18 | Explorar ejes → 4 ejes oficiales con sus lecciones publicadas | S | 3 | ✅ |
| CP-15 | RF-11 | Resolver ejercicio correctamente → retroalimentación de éxito | U + S | 3 | ✅ |
| CP-16 | RF-11 | Resolver ejercicio incorrectamente → solución paso a paso | U + S | 3 | ✅ |
| CP-17 | RF-12 | Rendir simulacro con cronómetro → puntaje 100–1000 y tiempo registrado | S | 3 | ✅ |
| CP-18 | RF-13 | Consultar panel de progreso → % por eje actualizado | S | 3 | ✅ |
| CP-19 | RF-14 | Reporte institucional → promedio y áreas débiles de la sede | S | 4 | ✅ |
| CP-20 | RF-17 | Métricas globales → concurrencia y actividad agregados | S | 4 | ✅ |
| CP-21 | RF-15 | Publicidad → banner visible en Free, ausente en Institucional | S | 5 | ✅ |
| CP-22 | RF-02 | RBAC: Estudiante accede a panel de Superadmin → HTTP 403 | I | 1 | ✅ |

## Pruebas automatizadas actuales

| Comando | Cobertura |
|---|---|
| `npm test` | `tests/health.test.js` (health, 404 JSON) + `tests/error-handler.test.js` (errores controlados vs. 5xx) + `tests/servicios.test.js` (CP-15/CP-16 retroalimentación y CP-17 puntaje 100–1000, nivel U) + `tests/publicidad.test.js` (RF-15 segmentación por modalidad, nivel U) — **17 pruebas** |
| `npm run test:db` | `tests/db/schema.test.js` (14 tablas, 3 roles, 4 ejes, `health/db`) + `tests/integration/auth.test.js` (CP-01…CP-06) + `tests/integration/rbac.test.js` (CP-22) + `tests/integration/fase2.test.js` (CP-07, CP-08, CP-11, CP-12, CP-13) + `tests/integration/fase3.test.js` (CP-14, CP-15, CP-16, CP-17, CP-18) + `tests/integration/fase4.test.js` (CP-09, CP-10, CP-19, CP-20) + `tests/integration/fase5.test.js` (CP-21, CRUD completo RF-08/09/10 y OWASP: rate limiting + no-store) — **82 pruebas** |
| `npm run test:coverage` | Las suites anteriores con informe de cobertura (RNF-07) |

**Total: 99 pruebas.** Además, los flujos completos de la Fase 1 (registro →
login → perfil → logout), de la Fase 3 (CP-14 explorar contenidos, CP-15/CP-16
práctica con retroalimentación, CP-17 simulacro cronometrado → puntaje 550 con
revisión, CP-18 panel de progreso con % por eje), de la Fase 4 (CP-09 matrícula
y baja lógica por UI, CP-10 evento de calendario visible solo en su sede y
publicado al estudiante con fecha correcta, CP-19 reporte con promedio y áreas
débiles ordenadas, CP-20 métricas con concurrencia y serie de 7 días; además
RBAC inverso: estudiante → `/institucion` y Admin Institución →
`/admin` redirigen al inicio) y de la Fase 5 (CP-21 banner visible para
cuenta Free en landing/contenido con rotación de anuncios, oculto para cuenta
Institucional, sin elemento en la interfaz B2B; E2E del rate limiting —
intento 11 → 429 con `Retry-After` — y `Cache-Control: no-store` en
`/api/auth`) se verificaron en navegador real sobre el servidor corriendo,
con 0 errores de consola (bitácora 2026-10-05).

## Verificación de RNF (métricas del informe, sección 13)

| KPI | Meta | Cómo se mide | Estado |
|---|---|---|---|
| Cobertura de código | ≥ 80 % | `npm run test:coverage` → 87,23 % stmts / 89,77 % líneas (99 pruebas; 2026-10-07) | ✅ |
| Análisis estático | 0 bloqueos críticos | `npm run lint` (backend + frontend) | ✅ |
| Latencia API | ≤ 2,0 s (95 %) | `npm run benchmark` → peor p95 = 31,6 ms (6 rutas, 50 solicitudes) | ✅ |
| Disponibilidad | ≥ 99,5 % | monitoreo en servidor dedicado (ADR-002) | ⬜ (producción) |
| Vulnerabilidades | 0 altas/críticas | `npm audit --omit=dev` backend → 0; auditoría de instalación frontend → 0 (2026-10-07) | ✅ |
| Accesibilidad | WCAG 2.1 AA | Lighthouse 100/100 en landing y páginas de estudio (RNF-05) | ✅ |
