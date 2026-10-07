# Cambios del proyecto

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).
Las entradas de esta bitácora se vuelcan al informe al cierre de cada fase.

## [0.7.0] — 2026-10-07 — Preparación para despliegue

### Corregido

- Se eligió React/Vite como la única interfaz activa. Las páginas HTML anteriores
  se movieron a `frontend/legacy-static-prototype/` y ya no se copian al build.
- La API liga a loopback por defecto, admite un proxy confiable configurable y
  falla al iniciar en producción si falta el build, el secreto de sesión, el
  origen HTTPS público, la base de datos o los datos SMTP.
- La recuperación de contraseña envía el enlace correcto `/restablecer?token=…`
  por SMTP en producción. El token no se expone en la respuesta de producción.
- `db:reset` se bloquea en producción para evitar borrar la base.
- Se añadió `admin:bootstrap`, un alta inicial de SUPERADMIN interactiva que
  oculta la contraseña y solo funciona mientras no exista ya una cuenta.
- Los promedios de reportes institucionales ahora incluyen a cada estudiante y
  contenido de la sede; el progreso sin registros cuenta como cero.
- El build divide páginas con carga diferida y `.gitignore` excluye artefactos
  `dist` y `build` en cualquier subcarpeta.
- Se retiraron credenciales de demostración del índice de capturas y se
  actualizaron sus rutas a la interfaz React.

### Dependencias y verificación

- Actualizados Vite, su plugin React, React Router y KaTeX por avisos de npm.
- Verificación local: 99/99 pruebas, lint sin errores, build correcto,
  auditoría frontend sin hallazgos y `npm audit --omit=dev` del backend sin
  vulnerabilidades (7 de octubre de 2026; detalle en Anexo H).
- El correo real, HTTPS, dominio, backups, monitoreo y compatibilidad en
  navegadores finales deben comprobarse en la infraestructura de publicación.

## [0.6.0] — 2026-10-05 — Fase 5: publicidad Free y pulido

### Añadido

- **RF-15 — publicidad segmentada (CP-21)**:
  - `GET /api/publicidad` (requiere sesión) entrega el **catálogo semilla
    local** de anuncios de centros CFT/IP solo cuando
    `tipo_suscripcion = 'FREE'`; cualquier cuenta INSTITUCIONAL recibe `[]`.
    La segmentación vive en el servidor (`services/publicidad.service.js`,
    catálogo `Object.freeze`, informativo y sin enlaces externos — proyecto
    100 % local, ADR-001).
  - `js/publicidad.js` pinta el banner rotativo en `<aside id="publicidad">`
    de la landing y de las 4 páginas de estudio; sin sesión, sin anuncios o
    ante un error el contenedor queda oculto y la navegación sigue intacta.
    La interfaz B2B (`admin.html`, `institucion.html`) no incluye el script
    ni el contenedor (defensa en profundidad).
  - Estilo `.publicidad` con etiqueta «Publicidad», landmark ARIA
    `complementary` y contraste AA.
- **Pulido OWASP (promesas abiertas en la ADR-003)**:
  - `middleware/security.middleware.js` con `crearLimitarLogin`: 10 intentos
    fallidos por IP + correo en 15 min → **429** con cabecera `Retry-After`;
    un inicio de sesión válido limpia el contador; estado en memoria por
    proceso (fábrica por aplicación; store externo queda para el ADR-004 de
    deploy). Aplicado a `POST /api/auth/login`.
  - `noStore`: `Cache-Control: no-store, private` + `Pragma: no-cache` en
    todas las respuestas de `/api/auth/*`.
- **Calidad (RNF-01 y RNF-07 cerrados)**:
  - `npm run test:coverage` → **88,02 % stmts / 90,22 % líneas** (meta ≥ 80 %).
  - `npm run benchmark` (script propio con fetch nativo, sin dependencias):
    6 rutas calientes × 50 solicitudes → **peor p95 = 31,6 ms** (meta ≤ 2,0 s).
  - `npm audit` → 0 vulnerabilidades (RNF-03).
- **Pulido de cobertura**: CRUD administrativo de contenido que la Fase 2 no
  ejercitó (crear/editar eje con duplicados, editar lección con cambio de eje,
  obtener/editar/filtrar ejercicios, composición de simulacro y sus 404).

### Corregido

- Jerarquía de encabezados WCAG (Lighthouse `heading-order`): las tarjetas
  de ejes pasan de `h3` a `h2` (antes salto h1 → h3) y `ejercicios.html`
  usa `h2` para «Ejercicios disponibles» → **Lighthouse 100/100** en
  accesibilidad y best practices en landing y páginas de estudio (RNF-05).

### Pruebas

- `tests/publicidad.test.js` (4 unitarias de la segmentación) +
  `tests/integration/fase5.test.js` (10: CP-21 con Free/Institucional/Admin,
  CRUD RF-08/09/10 y OWASP rate-limit + no-store) → **99 pruebas en verde**
  (17 unit + 82 con BD), lint 0 errores. CP-21 verificado además en navegador
  real con 0 errores de consola.

## [0.5.0] — 2026-10-05 — Fase 4: módulo institucional (B2B)

### Añadido

- **Panel de mi sede** (`institucion.html`, rol `ADMIN_INSTITUCION`, 403 para
  el resto) con 3 pestañas y módulos en `js/institucion/`:
  - **RF-07** `GET/POST/PUT/DELETE /api/institucion/estudiantes` — matrícula,
    edición y **baja lógica** de los estudiantes de la sede propia
    (CP-09). El alta vincula `id_institucion` = sede del admin,
    `id_usuario_creador` = admin (trazabilidad jerárquica) y
    `tipo_suscripcion='INSTITUCIONAL'`; un estudiante de otra sede responde
    **404** y un correo repetido **409**.
  - **RF-16** `/api/institucion/calendario` (CRUD con pertenencia 404) +
    `GET /api/calendario` para el estudiante: publica **solo** los eventos de
    su sede y `[]` al Estudiante Free (CP-10). La fecha viaja como **reloj de
    pared** `YYYY-MM-DDTHH:MM` (`to_char`, sin deriva de huso) y se muestra en
    `avance.html` («Próximos ensayos de tu sede»).
  - **RF-14** `GET /api/institucion/reporte` (CP-19) — resumen de la sede
    (estudiantes/activos, prácticas, simulacros, promedio y mejor puntaje) +
    **áreas débiles**: ejes con menor progreso promedio primero, con
    respuestas, aciertos y diagnóstico < 50 %.
  - **RF-17** `GET /api/admin/metricas` (Superadmin, CP-20) — concurrencia
    (usuarios/activos, sedes, usuarios por rol) y actividad (prácticas,
    simulacros, puntaje promedio, respuestas, hoy/7d) + **serie diaria de los
    últimos 7 días** vía `generate_series`, con pestaña nueva «Métricas» en
    `admin.html`.
- **`js/panel.js` compartido**: guarda de rol, badge, cierre de sesión,
  pestañas accesibles y evento `seccion-activada`; `admin/admin.js` quedó como
  wrapper de `iniciarPanel('SUPERADMIN')` (refactor sin cambio de
  comportamiento).
- Middleware `cargarInstitucion` (`req.idInstitucion` = sede del admin en
  sesión; 403 si no tiene sede) — todo el módulo opera sobre la sede propia.
- **Extensión de esquema**: tabla `CALENDARIO_ENSAYO` (14.ª tabla) + índice
  `idx_calendario_institucion`; decisión y justificación en la bitácora.
- `index.html`: enlace «Mi sede» visible solo para `ADMIN_INSTITUCION`;
  badge del MVP a «Fase 4».
- Pruebas: `tests/integration/fase4.test.js` (16 integración: CP-09, CP-10,
  CP-19, CP-20 con verificación en BD) y esquema 14 tablas → **85 pruebas en
  verde** (13 + 72), lint 0 errores; CP-09/10/19/20 además verificados en
  navegador real con 0 errores de consola.

### Corregido

- `calendario.repository.listarPorInstitucion` devolvía el `timestamp` crudo
  (JSON con huso `…Z`), lo que desfasaba la hora mostrada; detectado en el
  humo de la Fase 4 y corregido con `to_char` + aserción de regresión.

### Pendiente (próxima fase)

- Fase 5 — Publicidad Free y pulido: RF-15 + cierre de pruebas CP.

## [0.4.0] — 2026-10-05 — Fase 3: experiencia del estudiante

### Añadido

- **Módulo estudiante** (rol `ESTUDIANTE`, 403 para el resto) con 4 grupos
  de rutas nuevas:
  - **RF-18** `GET /api/contenido/lecciones/:id` — teoría completa de la
    lección + listado de ejercicios **sin solución** (base del CP-14).
  - **RF-11** `GET /api/practica/ejercicios/:id` y
    `POST …/respuesta` — el ejercicio viaja sin `es_correcta` ni
    `explicacion_solucion`; el servidor evalúa y devuelve la
    **retroalimentación inmediata**: mensaje de éxito (CP-15) o solución
    paso a paso + alternativa correcta (CP-16). Cada intento queda auditado
    en `HISTORIAL_AVANCE` + `RESPUESTA_USUARIO` y recalcula `PROGRESO`.
  - **RF-12** `GET /api/simulacros`, `POST …/:id/intentar`,
    `PUT /api/simulacros/intentos/:id/respuestas` y
    `POST …/finalizar` — ciclo de vida del intento sin tocar el esquema:
    las preguntas salen ocultas, las respuestas solo confirman guardado y el
    cierre calcula `puntaje = 100 + 900·aciertos/total` (**100–1000**),
    valida `duracion ≤ 140` y devuelve la revisión por pregunta (CP-17).
  - **RF-13** `GET /api/progreso` — cifras globales, **% de progreso por
    eje** (promedio de PROGRESO por contenido) e historial reciente (CP-18).
- Servicios puros `retroalimentacion.service` y `puntaje.service`
  (reglas de negocio sin BD/HTTP → nivel unitario de CP-15/CP-16/CP-17) y
  repositorio `avance.repository` (historial, respuestas y progreso).
- **Frontend del estudiante**: `contenido.html` (tarjetas de los 4 ejes +
  detalle de lección), `ejercicios.html` (selector → práctica con feedback y
  barra de progreso), `simulacro.html` (cronómetro en vivo con aviso a los
  5 min, auto-finalización, resultado con puntaje y revisión ✓/✗) y
  `avance.html` (cifras, barras por eje e historial), con módulos en
  `js/estudiante/` y estilos nuevos en `base.css`.
- Pruebas: `tests/servicios.test.js` (8 unitarias) +
  `tests/integration/fase3.test.js` (17 integración: CP-14 … CP-18 con
  verificación en BD) → **69 pruebas en verde** (13 + 56).

### Cambiado

- `esc`/`fechaCorta` se movieron de `js/admin/admin.js` a **`js/util.js`**
  compartido por el panel admin y el módulo estudiante (refactor sin cambio
  de comportamiento; `admin.html` carga el script nuevo).
- `index.html`: navegación del inicio enlaza ahora a las páginas reales
  (Contenidos, Ejercicios, Simulacros, Mi avance) y badge del MVP a
  «Fase 3».

### Pendiente (próxima fase)

- Fase 4 — Módulo institucional (B2B): RF-07, RF-14, RF-16, RF-17.

## [0.3.0] — 2026-10-03 — Fase 2: contenido y administración (backend + panel)

### Añadido

- Panel Superadmin protegido con `authenticate + requireRole('SUPERADMIN')`:
  - **RF-05** `GET/POST/PUT/DELETE /api/admin/instituciones` — CRUD de
    instituciones B2B con **baja lógica** (`activo=false`, sin borrado físico
    para preservar la trazabilidad de los usuarios vinculados) y conteo de
    usuarios por sede.
  - **RF-06** `…/api/admin/administradores` — alta de administradores de
    sede: rol `ADMIN_INSTITUCION`, asociación a institución activa,
    `id_usuario_creador` (jerarquía del esquema) y suscripción `INSTITUCIONAL`.
  - **RF-08** `…/api/admin/ejes` y `…/api/admin/lecciones` — estructuración
    y publicación de ejes/lecciones.
  - **RF-09** `…/api/admin/ejercicios` — banco de ejercicios con **reglas del
    informe**: 4–5 alternativas y exactamente una correcta; guardado
    transaccional (ejercicio + alternativas, todo o nada).
  - **RF-10** `…/api/admin/simulacros` — parametrización con defaults
    oficiales **65 preguntas / 140 min**, rangos validados y composición de
    preguntas numeradas 1..n (valida existencia y duplicados → 400, nunca 500).
- `GET /api/ejes` (sesión de cualquier rol): ejes con lecciones publicadas —
  visión estudiante que verifica el CP-11 y sienta la base del RF-18 (Fase 3).
- Tests: `tests/integration/fase2.test.js` (CP-07, CP-08, CP-11, CP-12,
  CP-13) con verificación en BD → **44 pruebas en verde**.
- **Frontend del panel** (`admin.html` + `js/admin/`): cinco pestañas
  accesibles (role=tab/tabpanel) con CRUD por sección — formularios en
  varias columnas, filas con acciones (editar / baja lógica / reactivar),
  alternativas dinámicas 4–5 con radio de correcta, y composición de
  simulacros con lista doble (agregar, ordenar, quitar).
- `exigirRol()` en `js/auth.js`: guarda reutilizable (sin sesión → login con
  `?redirigir=`; con otro rol → inicio) y enlace «Administración» en el
  inicio visible solo para SUPERADMIN.
- Evento `seccion-activada`: cada pestaña refresca sus datos y selects al
  activarse (evita listas desactualizadas entre secciones).
- **ESLint del frontend**: `eslint.frontend.config.js` con globals del
  navegador y de los scripts compartidos, enganchado a `npm run lint` — el
  análisis estático cubre ahora backend **y** frontend vanilla.

### Cambiado

- `index.html`/`js/app.js`: badge del MVP a «Fase 2» y enlace al panel según
  el rol de la sesión.
- `usuario.repository`: `actualizarPerfil` → `actualizar` (lista blanca
  ampliada: cargo, institución, activo) + `listarPorRol` con nombre de sede.
- `utils/validate.js`: validadores genéricos reutilizables
  (`validarObligatorio`, `validarEntero`, `validarUrlOpcional`,
  `validarAlternativas`, `idDeRuta`).

## [0.2.0] — 2026-10-03 — Fase 1: autenticación y RBAC (RF-01 … RF-04)

### Añadido

- **ADR-003**: hash **Argon2id** (`@node-rs/argon2`, binarios precompilados)
  con parámetros OWASP (m=19456, t=2, p=1), y **JWT (HS256) en cookie
  `httpOnly` + `sameSite=Lax`** (`secure` en producción) para la sesión.
- Seguridad de configuración: `JWT_SECRET` (48 bytes aleatorios) y
  `JWT_EXPIRES_HOURS=8` en `backend/.env` (gitignored); plantilla
  `backend/.env.example`; fail-fast si el secreto falta en producción.
- Endpoints de la Fase 1:
  - `POST /api/auth/registro` (RF-01) — crea Estudiante Free sin iniciar sesión;
  - `POST /api/auth/login` / `logout` y `GET /api/auth/sesion` (RF-02);
  - `POST /api/auth/recuperar` / `restablecer` (RF-03) — token de 32 bytes,
    un solo uso y 30 min, sobre la tabla existente `TOKEN_RECUPERACION`;
  - `GET/PUT /api/perfil` (RF-04) — siempre el propio usuario;
  - `GET /api/admin/panel` — guardián RBAC (CP-22).
- Middlewares `authenticate` (JWT desde cookie) y `requireRole` (401 sin
  sesión / 403 con rol distinto).
- Servicios: `password.service` (Argon2id + hash ficticio anti-enumeración
  por latencia), `token.service` (JWT y tokens de recuperación) y
  `mailer.service` (consola en desarrollo; proveedor real pendiente de ADR).
- Frontend vanilla: páginas `registro`, `login`, `recuperar`, `restablecer` y
  `perfil`; cliente `js/api.js` (fetch + errores de la API) y `js/auth.js`
  (sesión, guardas y cierre); estilos de formularios accesibles (labels,
  `aria-live`, foco visible).
- Tests de integración: `tests/integration/auth.test.js` (CP-01 … CP-06) y
  `tests/integration/rbac.test.js` (CP-22) → **16 pruebas en verde**
  (25 en total con `npm test` y el esquema).
- Documentación: ADR-003 y `BITACORA-DESARROLLO.md` (registro cronológico
  para el informe).

### Cambiado

- `npm test` ignora `tests/db/` **e** `tests/integration/`; `npm run test:db`
  ejecuta ambas carpetas (las dos requieren PostgreSQL).
- `config.js`: `SESSION_SECRET` (sin usar) reemplazado por
  `security.jwtSecret` + `jwtExpiresHours` + `cookieName`.
- Portada: badge "Fase 1 (autenticación)", estado de sesión y acceso rápido
  a Ingresar/Mi perfil.

### Pendiente (próxima fase)

- Fase 2 — Contenido y administración: RF-05, RF-06, RF-08, RF-09, RF-10.
- ADR-004 — correo transaccional de producción (proveedor SMTP/API).
- Rate limiting de login y cabeceras anti-cache (pulido OWASP, Fase 5).

## [0.1.0] — 2026-10-03 — Fase 0: andamiaje del proyecto

### Creado

- Repositorio Git **local** (rama `main`, sin remoto) con `.gitignore` que excluye
  `.env`, `node_modules/` y artefactos de build.
- Estructura del backend en **3 capas con MVC + Repository** (informe v3, sección 7):
  `routes → controllers → repositories → db/pool`.
- API Express 5 con:
  - `GET /api/health` — estado del servicio (sin BD);
  - `GET /api/health/db` — estado de PostgreSQL con latencia (devuelve 503 si cae);
  - manejador centralizado de errores y 404 en JSON (RNF-03: sin filtrado de detalles 5xx);
  - `helmet` (cabeceras seguras) y CORS solo si se declara `CORS_ORIGIN`.
- Frontend estático **vanilla** mínimo (`frontend/public/`) servido por la propia API.
- `db/schema.sql`: esquema oficial v3.0 (13 tablas, 9 índices, datos semilla de
  3 roles y 4 ejes DEMRE) como fuente de verdad en desarrollo.
- Script `npm run db:reset`: reconecta la base `m1paes` y carga el esquema con
  verificación de tablas e índices.
- Herramientas de calidad: ESLint 9 (configuración plana), Jest + Supertest
  (`npm test`, `npm run test:db`).
- **PostgreSQL 17 local** (servicio de Windows `postgresql-x64-17`, instalador
  oficial verificado por SHA256 contra el manifiesto de winget): base `m1paes`
  creada con el esquema v3 — **13 tablas, 28 índices**, semilla de 3 roles y
  4 ejes DEMRE. `npm run db:reset` y `npm run test:db` (4 pruebas) en verde.
- Documentación técnica: ADR-001 (stack), ADR-002 (base de datos), tablero de
  requisitos (18 RF) y plan de pruebas (22 CP).

### Corregido

- `GET /api/health/db` devolvía "Error interno del servidor" en su 503:
  `errorHandler` ahora distingue errores controlados (`AppError`, mensajes
  propios) de errores no previstos — los segundos siguen ocultos (RNF-03).
  Cubierto por `tests/error-handler.test.js`.

### Pendiente (próxima fase)

- Fase 1 — Autenticación y RBAC: RF-01 a RF-04 (ver `REQUISITOS.md`).
- ADR-003 — estrategia de autenticación (hash de contraseñas y sesiones).
