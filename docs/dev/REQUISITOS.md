# Tablero de requisitos (informe v3, sección 5)

Fuente: catálogo oficial **RF-01 … RF-18** y trazabilidad **RF ↔ CU ↔ CP** (v3.0).
Este tablero es el registro de avance por requisito; al cierre de cada fase se
vuelca al informe.

**Leyenda de estado:** ⬜ pendiente · 🔧 en curso · ✅ implementado · ✅✔️ verificado con pruebas

## Fases de desarrollo

| Fase | Nombre | Requisitos |
|---|---|---|
| 0 | Andamiaje del proyecto | — (herramientas, esquema, API base) |
| 1 | Autenticación y RBAC | RF-01 … RF-04 |
| 2 | Contenido y administración | RF-05, RF-06, RF-08, RF-09, RF-10 |
| 3 | Experiencia del estudiante | RF-18, RF-11, RF-12, RF-13 |
| 4 | Módulo institucional (B2B) | RF-07, RF-14, RF-16, RF-17 |
| 5 | Publicidad Free y pulido | RF-15 + cierre de pruebas CP |

## Requisitos funcionales

| RF | Descripción | Prioridad | Fase | CP | Estado |
|---|---|---|---|---|---|
| RF-01 | Autoregistro de Estudiante Free (nombre, correo, contraseña cifrada) | Alta | 1 | CP-01 | ✅✔️ |
| RF-02 | Inicio y cierre de sesión seguro (3 perfiles) | Alta | 1 | CP-02, CP-03, CP-04, CP-22 | ✅✔️ |
| RF-03 | Recuperación de contraseña con tokens temporales | Media | 1 | CP-05 | ✅✔️ |
| RF-04 | Consulta y edición del perfil propio | Media | 1 | CP-06 | ✅✔️ |
| RF-05 | CRUD de instituciones bajo convenio B2B (Superadmin) | Alta | 2 | CP-07 | ✅✔️ |
| RF-06 | CRUD de Administradores de Institución (Superadmin) | Alta | 2 | CP-08 | ✅✔️ |
| RF-07 | Matrícula/baja de estudiantes (Admin Institución) | Alta | 4 | CP-09 | ✅✔️ |
| RF-08 | Estructurar y publicar ejes/lecciones (Superadmin) | Alta | 2 | CP-11 | ✅✔️ |
| RF-09 | Administrar banco de ejercicios con solución (Superadmin) | Alta | 2 | CP-12 | ✅✔️ |
| RF-10 | Parametrizar simulacros 65 preguntas / 140 min (Superadmin) | Alta | 2 | CP-13 | ✅✔️ |
| RF-11 | Resolver ejercicios con retroalimentación inmediata | Alta | 3 | CP-15, CP-16 | ✅✔️ |
| RF-12 | Rendir simulacros cronometrados (puntaje 100–1000) | Alta | 3 | CP-17 | ✅✔️ |
| RF-13 | Registro de avance y panel de progreso | Alta | 3 | CP-18 | ✅✔️ |
| RF-14 | Reportes consolidados del rendimiento (Admin Institución) | Media | 4 | CP-19 | ✅✔️ |
| RF-15 | Publicidad segmentada solo en cuentas Free | Media | 5 | CP-21 | ✅✔️ |
| RF-16 | Calendario de ensayos de la sede (Admin Institución) | Media | 4 | CP-10 | ✅✔️ |
| RF-17 | Métricas globales de concurrencia/actividad (Superadmin) | Media | 4 | CP-20 | ✅✔️ |
| RF-18 | Explorar ejes temáticos y lecciones publicadas (Estudiante) | Alta | 3 | CP-14 | ✅✔️ |

## Requisitos no funcionales (se verifican de forma continua)

| RNF | Cómo se verifica | Estado |
|---|---|---|
| RNF-01 (≤ 2,0 s) | `npm run benchmark`: peor p95 = 31,6 ms en 6 rutas calientes (50 solicitudes c/u) | ✅ |
| RNF-02 (hash de contraseñas) | Fase 1: Argon2id + JWT en cookie httpOnly (`secure` en producción) — ADR-003 | ✅ |
| RNF-03 (OWASP) | helmet, JSON limitado, consultas parametrizadas, errores 5xx genéricos + rate limiting (10 fallos/15 min) + no-store en auth; auditorías backend producción y frontend sin hallazgos (2026-10-07) | ✅✔️ |
| RNF-04 (≥ 99,5 %) | Monitoreo de disponibilidad en producción (ver ADR-002) | ⬜ |
| RNF-05 (WCAG 2.1 AA) | Lighthouse 100/100 (accesibilidad y best practices) en index/contenido/ejercicios/avance con banner; landmarks ARIA y jerarquía de encabezados corregida | ✅✔️ |
| RNF-06 (multiplataforma) | Chromium verificado + breakpoints responsivos (max-width 860 px, flex-wrap); Firefox/Edge/Safari pendientes de entorno | 🔧 (parcial) |
| RNF-07 (Mantenibilidad) | `npm run lint` sin errores + `npm run test:coverage`: 87,23 % stmts / 89,77 % líneas (99 pruebas, 2026-10-07; ≥ 80 %) | ✅✔️ |
| RNF-08 (integridad) | FK/PK del esquema + tests de esquema (`npm run test:db`) | ✅ (esquema) |
