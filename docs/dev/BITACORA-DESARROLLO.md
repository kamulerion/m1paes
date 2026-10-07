# Bitácora de desarrollo (entrada para el informe)

Registro cronológico de decisiones, hitos, incidencias y verificaciones del
desarrollo. Está pensado para volcarse a la sección de *proceso de desarrollo*
del informe al cierre de cada fase (ver también `CHANGELOG.md` para el detalle
por versión y los ADR-00x para las decisiones técnicas).

---

## 2026-10-03 — Fase 0: andamiaje del proyecto

**Objetivo:** estructurar el repositorio, API base, calidad automatizada y
documentación técnica, sobre el stack definido en ADR-001.

- `git init` en rama `main` **sin remoto** (restricción: nada sale del equipo
  hasta el deploy). Identidad provisional del proyecto para los commits.
- Estructura en 3 capas (MVC + Repository): `routes → controllers →
  repositories → db/pool`, frontend vanilla en `frontend/public` servido por
  la propia API (mismo origen).
- `db/schema.sql` = esquema v3.0 del informe (fuente de verdad en dev) +
  `npm run db:reset` (destructivo, solo dev).
- API base: `GET /api/health`, `GET /api/health/db`, 404 en JSON y manejo
  central de errores.
- Documentación inicial: `README.md`, ADR-001 (stack), ADR-002 (base de
  datos), `REQUISITOS.md` (18 RF), `PLAN-PRUEBAS.md` (22 CP), `CHANGELOG.md`.
- Commits: `e68354a` (andamiaje, 57 archivos) y `f9b1eb3` (corrección).

**Incidencia 1 — prueba de humo:** al probar la API real,
`GET /api/health/db` devolvía en su 503 el mensaje «Error interno del
servidor» en lugar del mensaje controlado. Causa: `errorHandler`
confundía un `AppError` intencional con un error no previsto. Corrección:
`AppError` ahora marca `expose` y el manejador distingue errores
controlados de los inesperados (los 5xx siguen ocultos — RNF-03). Quedó
cubierto por `tests/error-handler.test.js` (+3 pruebas).

**Instalación de PostgreSQL 17 (ADR-002):**

- Primera descarga con `Invoke-WebRequest` **colgó sin avanzar** → se
   relanzó con `curl.exe` (`--retry 5 -C -`): 394 MB en 14 s.
- **Control de integridad:** SHA256 del instalador calculado localmente
   (`612C7F54…E329072`) coincidió **exactamente** con el publicado en el
   manifiesto oficial `PostgreSQL.PostgreSQL.17` del repositorio winget-pkgs
   de Microsoft → instalador ejecutado.
- Instalación desatendida (`--mode unattended --unattendedmodeui none`),
   elevación UAC, servicio `postgresql-x64-17` quedó **Running**.

**Incidencia 2 — `db:reset`:** la primera ejecución creó la base pero falló
con `Cannot read properties of undefined (reading 'total')`. Causa: en
`scripts/reset-db.js` la segunda consulta de verificación no hacía
*destructuring* (`indexes[0]` en el objeto `Result` de `pg`, no un array).
Corregido (`rows: indexRows`); se descartó un script de depuración temporal.

**Verificación de cierre de Fase 0:**

| Verificación | Resultado |
|---|---|
| `npm run lint` | ✅ 0 errores |
| `npm test` (sin BD) | ✅ 5/5 pruebas |
| `npm run test:db` (con BD) | ✅ 4/4 pruebas |
| `npm run db:reset` | ✅ 13 tablas, 28 índices (9 de rendimiento explícitos) |
| Git | ✅ commit `025d248`, árbol limpio, sin remoto |

---

## 2026-10-03 — Fase 1: decisiones de autenticación (ADR-003)

Equipo decide y registra en `ADR-003-autenticacion.md`:

- **Hash:** **Argon2id** (OWASP) con `@node-rs/argon2` (binarios precompilados,
  sin toolchain de compilación en Windows) — alternativa a bcrypt, también
  aceptada por el informe.
- **Sesión:** **JWT (HS256) en cookie `httpOnly` + `sameSite=Lax`**, TTL 8 h,
  `secure` en producción. Descartada la tabla de sesiones para **no alterar el
  esquema publicado de 13 tablas** (informe ↔ MER ↔ test de esquema).
- `JWT_SECRET` en `.env` (gitignored); fail-fast en producción.
- Registro de recuperación sobre la tabla ya existente `TOKEN_RECUPERACION`
  (token de un solo uso, 30 min).

**Implementación (mismo día):**

- Backend respetando las 3 capas: `repositories/usuario.repository.js` y
  `repositories/token.repository.js` → `controllers/auth|perfil|admin` →
  `routes/auth|perfil|admin`, más `middleware/auth.middleware.js`
  (`authenticate`, `requireRole`) y `utils/validate.js` (validaciones sin
  dependencias externas).
- Frontend vanilla: 5 páginas nuevas (`registro`, `login`, `recuperar`,
  `restablecer`, `perfil`), cliente compartido `js/api.js`, utilidades de
  sesión `js/auth.js` y estilos de formularios con foco visible y `aria-live`.

**Incidencias y aprendizajes:**

3. *Scripts npm en Windows*: `--testPathIgnorePatterns=/tests/(db|integration)/`
   rompía la ejecución porque `cmd.exe` interpreta `|` como tubería → se usan
   dos flags separados.
4. *Secuencia de pruebas*: el CP-04 (logout) cerraba la sesión del agente
   compartido y el CP-06 recibía 401 → se añade un `beforeAll` que vuelve a
   entrar con la contraseña nueva (lo que además replica el flujo real
   posterior a una recuperación).
5. *Prueba de humo con `curl.exe`*: PowerShell 5.1 altera las comillas de los
   argumentos nativos y el JSON llegaba corrupto (400 del parser) → repetida
   con `Invoke-RestMethod`, que codifica bien el cuerpo y maneja cookies.

**Verificación de cierre de Fase 1:**

| Verificación | Resultado |
|---|---|
| `npm run lint` | ✅ 0 errores |
| `npm test` (sin BD) | ✅ 5/5 |
| `npm run test:db` (esquema + auth + RBAC) | ✅ 20/20 |
| **Total de pruebas** | ✅ **25/25** |
| Humo en servidor real (registro → login → 401 genérico → perfil → 403 RBAC → recuperación con token de un solo uso → logout → 401) | ✅ |
| Flujo en navegador: registro → login → perfil → editar nombre → cerrar sesión (consola sin errores) | ✅ CP-01, CP-02, CP-04, CP-06 |
| Guarda de ruta: `/perfil.html` sin sesión → `login.html?redirigir=/perfil.html` | ✅ |

**Estado al cierre:** RF-01 … RF-04 ✅✔️ · RNF-02 ✅ · RNF-03 🔧 (falta rate
limiting) · RNF-07 🔧 (falta cobertura ≥ 80 %).

---

## 2026-10-03 — Fase 2: contenido y administración (RF-05, RF-06, RF-08, RF-09, RF-10)

**Alcance:** CRUD de instituciones B2B, alta de administradores de sede,
estructuración de ejes/lecciones, banco de ejercicios con las reglas del
informe (4–5 alternativas, una sola correcta) y parametrización de simulacros
(65 preguntas / 140 min).

**Decisiones (sin ADR nuevo; se apoyan en ADR-001/003):**

- Todo el panel exige `authenticate + requireRole('SUPERADMIN')` → 401 sin
  sesión y 403 con otro rol (además del CP-22, se probó con Estudiante y con
  ADMIN_INSTITUCION).
- **Baja lógica** (`activo=false`) en instituciones y administradores en vez
  de borrado físico: los usuarios referencian la sede y se preserva la
  trazabilidad.
- Ejercicio + alternativas se persisten en **transacciones** (todo o nada).
- `GET /api/ejes` (con sesión, cualquier rol) entrega los ejes con sus
  lecciones publicadas: permite verificar el CP-11 desde la vista del
  estudiante y sienta la base del RF-18 de la Fase 3.
- Composición de simulacro validada antes de escribir (existencia,
  duplicados, límite parametrizado) para responder 400 y no 500.

**Incidencias:**

6. En `simulacro.controller.editar` quedó una línea `delete body.nombre` que
   impedía editar el nombre del simulacro → corregida por revisión antes de
   ejecutar las pruebas.
7. En `fase2.test.js` quedó una constante sin usar (`alternativasValidas`);
   al eliminarla con un edit mal dirigido se duplicó el bloque → corregido.
   ESLint volvió a ser el que la detectó.

**Verificación (backend):**

| Verificación | Resultado |
|---|---|
| `npm run lint` | ✅ 0 errores |
| `npm test` (sin BD) | ✅ 5/5 |
| `npm run test:db` (esquema + auth + RBAC + fase 2) | ✅ 39/39 |
| **Total de pruebas** | ✅ **44/44** |
| CP-07, CP-08, CP-11, CP-12, CP-13 | ✅ (incluye verificación en BD) |

> Corrección de conteos: en entradas anteriores las pruebas se contaron mal
> (se había informado 15/20 y 34/39). El desglose real por archivo es
> schema 4 + auth 13 + rbac 3 + fase 2 19 = **39** con BD, más 5 sin BD =
> **44 total**; todos los documentos quedaron ajustados.

---

### Fase 2 (continuación): panel de administración en el frontend

**Archivos nuevos:** `frontend/public/admin.html` + `js/admin/admin.js`
(guarda de rol, pestañas y helpers `esc`/`fechaCorta`), `instituciones.js`,
`administradores.js`, `contenido.js`, `ejercicios.js`, `simulacros.js`, y
estilos de panel/tablas/listas en `css/base.css`.

**Decisiones:**

- Las secciones esperan `panelListo` (promesa de la guarda `exigirRol`)
  antes de tocar la API: un rol no Superadmin nunca dispara llamadas 403.
- Cada pestaña refresca sus datos al activarse (evento `seccion-activada`),
  porque los selects (sedes, lecciones, ejercicios) dependen de lo creado en
  otras secciones.
- El lint se extendió al frontend con `eslint.frontend.config.js` (globals
  del navegador + globals compartidos `api`, `panelListo`, etc.). Detalle:
  ESLint ignora archivos fuera de la *base path* del `cwd`, así que el config
  vive en la raíz del repo y reexporta el de `backend/` (donde resuelve sus
  `require`); el script `lint` corre ambas partes.

**Incidencias (fase 2, frontend):**

8. El mensaje de éxito se borraba apenas mostrarse: `limpiarFormulario()`
   limpiaba el estado `aria-live` después del `mostrarMensaje` → invertido
   el orden en los 5 formularios (limpiar y *luego* anunciar).
9. La tabla de administradores mostraba `undefined` en el ID: el serializador
   expone `id`, no `idUsuario` → corregidas las 4 apariciones.
10. El select de lecciones estaba vacío al crear el primer ejercicio (datos
   cargados al abrir la página, antes de publicar la lección) → refresco por
   pestaña con `seccion-activada`.
11. La semilla de prueba usó `…@localhost`; `RE_CORREO` exige un dominio con
   punto → comportamiento correcto del producto, correo de prueba corregido.
12. `node -e` con `\$1` en PowerShell rompe los parámetros (`$1` se come la
   shell) → scripts temporales en archivo, como ya ocurría con `curl.exe`.
13. `npm run lint` fallaba con «outside of the base path» → ver decisión
   anterior (config en la raíz).
14. Los conteos de pruebas de las entradas previas estaban mal → corregidos
   (arriba).
15. Las capturas de pantalla del navegador no estuvieron disponibles (la
    ventana de escritorio no estaba visible); la evidencia queda en esta
    bitácora y en los tests automatizados.

**Verificación (frontend, navegador real sobre `http://127.0.0.1:3000`):**

| Flujo | Resultado |
|---|---|
| Login Superadmin → `/admin.html` con las 5 pestañas y badge de rol | ✅ |
| **CP-07 (UI):** crear institución → aparece en el listado; editar convenio → «Institución actualizada» y persiste | ✅ |
| **RF-06 (UI):** crear administrador → fila con correo, cargo, sede y «rol ADMIN_INSTITUCION»; ID correcto tras corregir el serializador | ✅ |
| **CP-11 (UI):** publicar lección en «Números» → «ya está disponible para los estudiantes» + fila con fecha (visibilidad del estudiante: CP-11 automatizado) | ✅ |
| **RF-09 (UI):** crear ejercicio con 4 alternativas; editar marcando la correcta «9» → verificado en BD (`es_correcta` movido) | ✅ |
| **CP-13 (UI):** simulacro nuevo → 65 preguntas / 140 min / 0 compuestas; composición con lista doble → «Simulacro compuesto con 1 pregunta(s)» | ✅ |
| Enlace «Administración» visible con sesión SUPERADMIN; oculto tras logout | ✅ |
| Guarda sin sesión: `/admin.html` → `login.html?redirigir=%2Fadmin.html` | ✅ |
| Guarda por rol: sesión ADMIN_INSTITUCION → redirigida al inicio | ✅ |
| Consola del navegador | ✅ sin errores en todo el recorrido |
| Limpieza de datos de prueba | ✅ BD en 0 usuarios / instituciones / contenido / simulacros |

**Estado al cierre de la Fase 2:** RF-05 ✅✔️ · RF-06 ✅✔️ · RF-08 ✅✔️ ·
RF-09 ✅✔️ · RF-10 ✅✔️ · RNF-07 🔧 (lint ya cubre frontend y backend;
falta cobertura ≥ 80 %).

---

## 2026-10-05 — Fase 3: experiencia del estudiante (RF-18, RF-11, RF-12, RF-13)

**Alcance:** exploración de los 4 ejes oficiales con sus lecciones, práctica
de ejercicios con retroalimentación inmediata, simulacro cronometrado
(65 preguntas / 140 min, puntaje 100–1000) y panel de progreso por eje.

**Decisiones (sin ADR nuevo; se apoyan en ADR-001/003):**

- Módulo estudiante con `authenticate + requireRole('ESTUDIANTE')` (403 al
  resto): rutas nuevas `GET /api/contenido/lecciones/:id` (RF-18),
  `GET|POST /api/practica/ejercicios/:id[/respuesta]` (RF-11),
  `GET /api/simulacros` + `intentar` / `intentos/:id/respuestas` /
  `intentos/:id/finalizar` (RF-12) y `GET /api/progreso` (RF-13).
- La retroalimentación vive en **servicios puros**
  (`retroalimentacion.service.evaluarRespuesta` y
  `puntaje.service.calcularPuntajeSimulacro`), sin BD ni HTTP: por eso el
  CP-15/CP-16 se prueban a nivel **unitario** y el CP-17 usa la misma fórmula
  probada. El servicio lanza 400 si la alternativa no pertenece al ejercicio.
- El ejercicio se entrega **sin `es_correcta` ni `explicacion_solucion`**; la
  solución solo se revela al responder (éxito → mensaje; error → explicación
  paso a paso + alternativa correcta).
- Ciclo de vida del simulacro sobre `HISTORIAL_AVANCE` sin tocar el esquema
  v3: `intentar` crea el intento con **puntaje 0** y devuelve las preguntas
  ocultas; `respuestas` solo confirma «guardado» (un ensayo oficial no muestra
  aciertos hasta el final); `finalizar` calcula
  `puntaje = 100 + round(900 × aciertos / total)` → rango **100–1000**
  garantizado, valida `duracion_minutos ≤ 140` y devuelve la revisión por
  pregunta. El intento cerrado se detecta porque su puntaje queda **≥ 100**.
- `registrarRespuesta` implementa «última respuesta gana» (borra la previa
  del mismo intento+ejercicio) para no duplicar filas.
- `PROGRESO` se recalcula en el servidor por contenido: % de ejercicios con
  al menos un acierto (upsert sobre el `UNIQUE (id_estudiante, id_contenido)`);
  el panel RF-13 promedia por eje (`AVG`, contenidos sin práctica cuentan 0).
  En el resumen solo cuentan como «simulacros rendidos» los intentos
  finalizados.
- Frontend vanilla: 4 páginas nuevas (`contenido.html`, `ejercicios.html`,
  `simulacro.html`, `avance.html`) con módulos en `js/estudiante/`; cronómetro
  que descuenta en vivo (aviso a los 5 min y auto-finalización al llegar a 0)
  y envío de cada respuesta al elegirla (cola encadenada para no perder
  ninguna al cerrar). Helpers `esc`/`fechaCorta` se movieron de
  `admin/admin.js` a **`js/util.js` compartido** (refactor sin cambio de
  comportamiento; `admin.html` carga el script nuevo).

**Incidencias (fase 3):**

16. Un comentario SQL con comillas inversas (`` `intentar` ``) dentro de un
    template literal rompió el parseo de `avance.repository.js` → sustituidas
    por comillas dobles; lo detectó ESLint al instante.
17. `progreso.controller` declaraba `_req` pero usaba `req` → error `no-undef`
    de ESLint; parámetro corregido antes de ejecutar nada.
18. Postgres devuelve `DECIMAL` como *string* (`"50.00"` en JSON) → cast
    `::float` en los `SELECT`/`RETURNING` del repositorio de avance
    (`porcentaje`, `puntaje_obtenido`).
19. Verificación en navegador: los *refs* del árbol de accesibilidad expiran
    con cada snapshot/fill y `UnknownVizError` es intermitente → re-snapshot
    justo antes de cada `click`/`check` con reintento; además `wait` exige
    `condition` (texto o url), un `timeout` solo no es válido.
20. El árbol de accesibilidad mostró vacías las celdas de las tablas nuevas
    (el contenido sí existía en el DOM) → para esos controles se usó clic vía
    `evaluate` + verificación directa del DOM.

**Verificación (backend):**

| Verificación | Resultado |
|---|---|
| `npm run lint` (backend + frontend) | ✅ 0 errores |
| `npm test` (sin BD; incluye `tests/servicios.test.js`) | ✅ 13/13 |
| `npm run test:db` (esquema + auth + RBAC + fase 2 + fase 3) | ✅ 56/56 |
| **Total de pruebas** | ✅ **69/69** |
| CP-15/CP-16 (nivel U) y CP-14, CP-15, CP-16, CP-17, CP-18 (nivel I) | ✅ con verificación en BD |

**Verificación (frontend, navegador real sobre `http://127.0.0.1:3000`):**

| Flujo | Resultado |
|---|---|
| Registro de Estudiante Free → cuenta creada y login (CP-01) | ✅ |
| **CP-14:** `/contenido.html` → los **4 ejes oficiales** (Números, Álgebra y Funciones, Geometría, Probabilidad y Estadística) con la lección publicada; detalle con teoría completa y 2 ejercicios enlazados | ✅ |
| **CP-15:** práctica del ejercicio correcto → «¡Correcto!… Paso 1…» + barra de progreso **50 %** | ✅ |
| **CP-16:** respuesta incorrecta → «Solución paso a paso: … — Respuesta correcta: 6» y el progreso **no sube** (50 %) | ✅ |
| **CP-17:** simulacro 65/140 → cronómetro **139:44** descendiendo, «Respuesta guardada ✓», finalizar → **puntaje 550** (1/2 aciertos), 2 respondidas, 0 min, revisión ✓/✗; verificado en BD (`HISTORIAL_AVANCE` 550/0min, `PROGRESO` 50 %) | ✅ |
| **CP-18:** `/avance.html` → Números 50 %, resto 0 %, global **12,5 %**, resumen 2 prácticas / 1 simulacro / 550 mejor, historial con 3 filas | ✅ |
| RBAC: sesión SUPERADMIN en `/avance.html` y `/simulacro.html` → redirigido al inicio | ✅ |
| Regresión: `/admin.html` con las 5 pestañas y helpers `esc`/`fechaCorta` desde `util.js` | ✅ |
| Consola del navegador | ✅ sin errores en las 4 páginas nuevas y en admin |
| Limpieza de datos de prueba | ✅ BD en 0 usuarios / contenido / simulacros / historial / respuestas / progreso |

**Estado al cierre de la Fase 3:** RF-18 ✅✔️ · RF-11 ✅✔️ · RF-12 ✅✔️ ·
RF-13 ✅✔️ · RNF-07 🔧 (falta cobertura ≥ 80 %).

## 2026-10-05 — Fase 4: módulo institucional B2B (RF-07, RF-14, RF-16, RF-17)

**Alcance:** panel del Administrador de Institución con matrícula/edición/baja
de estudiantes de su sede, reporte consolidado de rendimiento con áreas
débiles, calendario de ensayos publicado por sede a sus estudiantes, y
métricas globales de concurrencia/actividad para el Superadmin.

**Decisiones (sin ADR nuevo; se apoyan en ADR-001/002/003):**

- **Extensión del esquema (a documentar en el informe):** el modelo del
  informe v3 no modela la persistencia del calendario de ensayos, por lo que
  se añadió la tabla **`CALENDARIO_ENSAYO`** (14.ª tabla) con
  `id_institucion FK CASCADE`, `id_usuario_creador FK SET NULL` (qué admin
  publicó el evento), título/descripción, `fecha_evento` y
  `fecha_creacion`, más el índice `idx_calendario_institucion`. Esquema de
  desarrollo: **14 tablas · 30 índices**; las 13 tablas originales quedan
  idénticas a los diagramas v1.1. `schema.test.js` y `reset-db.js`
  actualizados a 14.
- **Aislamiento por sede en el middleware:** nuevo
  `cargarInstitucion` (tras `authenticate + requireRole('ADMIN_INSTITUCION')`)
  que adjunta `req.idInstitucion` con la sede del admin en sesión (403 si no
  tiene sede). Todo el módulo opera **solo sobre SU sede**: un recurso de otra
  sede responde 404 (no 403) para no revelar su existencia.
- **RF-07 (CP-09):** alta con `tipo_suscripcion='INSTITUCIONAL'`,
  `id_usuario_creador`=admin y `id_institucion`=sede propia; edición
  parcial (nombre/correo/matrícula/opcional password) con 409 en correo
  duplicado; **baja lógica** (`activo=false`, el listado lo conserva como
  «Baja»), coherente con la baja lógica de Fase 2.
- **RF-16 (CP-10):** el evento se modela como **reloj de pared**: el navegador
  envía `datetime-local` (`YYYY-MM-DDTHH:MM`) y el repositorio formatea con
  `to_char(…, 'YYYY-MM-DD"T"HH24:MI')` al guardar, listar y devolver → ida y
  vuelta sin conversión de huso horario. `GET /api/calendario` (rol
  ESTUDIANTE) publica solo los eventos de la sede del estudiante; el
  Estudiante Free (sin sede) recibe `[]`.
- **RF-14 (CP-19):** `GET /api/institucion/reporte` → resumen (estudiantes/
  activos, prácticas, simulacros, `AVG`/`MAX` de puntaje) + `areas_debiles`:
  ejes con `AVG(PROGRESO)` **ascendente** (más débil primero) con respuestas,
  aciertos y diagnóstico «Área débil» bajo 50 %. Hecho en 2 consultas + join
  en el repositorio `reporte.repository` (sin ORM, SQL explícito).
- **RF-17 (CP-20):** `GET /api/admin/metricas` (Superadmin) con concurrencia
  (totales/activos, sedes, usuarios por rol y suscripción) y actividad
  (prácticas, simulacros, puntaje promedio, respuestas, hoy/7d), más la
  **serie diaria de 7 días** con `generate_series` (cada día cuenta sus
  HISTORIAL_AVANCE, incluidos los días vacíos → gráfico continuo).
- **Frontend vanilla:** `js/panel.js` **compartido** extrae el núcleo de
  pestañas/guard/badge/cierre (evento `seccion-activada`); `admin/admin.js`
  quedó como wrapper de `iniciarPanel('SUPERADMIN')` (refactor sin cambio de
  comportamiento) y nace `institucion/institucion.js` con
  `iniciarPanel('ADMIN_INSTITUCION')`. Página nueva `institucion.html` con
  3 pestañas (Estudiantes/Reportes/Calendario) y módulos en
  `js/institucion/`; pestaña «Métricas» nueva en `admin.html`
  (`js/admin/metricas.js`); la sección «Próximos ensayos de tu sede» en
  `avance.html`; enlace «Mi sede» en `index.html` visible solo para
  `ADMIN_INSTITUCION`.

**Incidencias (fase 4):**

21. Los tests fallaron en cascada porque `normalizarCorreo` persiste en
    minúsculas y las constantes de correo tenían mayúsculas (`estA` → `esta`):
    la aserción fallaba antes de asignar el id y todos los pasos siguientes
    usaban `undefined`. Corregidas las constantes; el script temporal de humo
    repitió el mismo error y se normalizó igual.
22. `expect.greaterThanOrEqual` **no existe** en Jest (solo hay
    `expect.any`/`objectContaining`, sin matchers numéricos anidados) → se
    reemplazó por lectura de `porRol` con `Object.fromEntries` + `toBeGreaterThanOrEqual`.
23. `metricasGlobales` devolvía el objeto `Result` de `pg` en vez de
    `serie.rows` → `toHaveLength` recibió un objeto gigante de tipos. Corregido
    a `serie: serie.rows`.
24. **Detectado en el humo del navegador:** `listarPorInstitucion` devolvía
    el `timestamp` crudo (JSON con huso `…12:00:00.000Z` en vez de la hora
    local `09:00`), porque solo `porId`/`crear`/`actualizar` tenían
    `to_char`. Corregido + **aserción de regresión** en `fase4.test.js` sobre
    el formato del listado.
25. `requestSubmit()` lanzado desde `evaluate` mientras la página aún cargaba
    cayó en el **submit nativo GET** (el handler JS de login no estaba
    adjunto): las credenciales terminaron en la query string y no hubo
    sesión. Solución: fill + clic real tras `wait condition: load` (patrón
    que funcionó siempre); se descartó el atajo.
26. Sondas de verificación con errores tontos: `getElementById` con un
    selector completo (`'#tabla-calendario tbody'` → null) y `await` dentro de
    una flecha no `async` en `.then` (SyntaxError) → corregidos en la sonda,
    no en el código de la app.

**Verificación (backend):**

| Verificación | Resultado |
|---|---|
| `npm run lint` (backend + frontend) | ✅ 0 errores |
| `npm test` (sin BD) | ✅ 13/13 |
| `npm run test:db` (esquema 14 tablas + auth + RBAC + fases 2-4) | ✅ 72/72 |
| **Total de pruebas** | ✅ **85/85** |
| CP-09, CP-10 (nivel I) y CP-19, CP-20 (nivel S) | ✅ con verificación en BD |

**Verificación (frontend, navegador real sobre `http://127.0.0.1:3000`):**

| Flujo | Resultado |
|---|---|
| **CP-09:** `/institucion.html` → matrícula por formulario (nombre, correo, clave, MAT-001) → «Estudiante matriculado.» y fila *Activo*; edición → «Estudiante actualizado.»; baja con confirm → «Estudiante dado de baja.», estado *Baja* y solo queda *Editar* | ✅ |
| **CP-09 (aislamiento):** Admin Sur no ve ni toca los estudiantes de la Norte (listado vacío; PUT/DELETE 404 en API) | ✅ |
| **CP-10:** evento «2026-10-20T09:00» creado en la sede Norte → aparece con **fecha correcta** en su calendario; Admin Sur lo tiene **vacío**; el estudiante de la Norte lo ve en `/avance.html` («Próximos ensayos de tu sede») y el de la Sur no | ✅ |
| **CP-19:** reporte con datos reales → «Sede Norte · 1 estudiante (1 activo)», **promedio 1000**, mejor 1000, 1 simulacro, 1 práctica; áreas débiles **ordenadas asc**: Álgebra/Geometría/Probabilidad 0 % «Área débil», Números 100 % «Satisfactorio» (2 respuestas, 2 aciertos) | ✅ |
| **CP-20:** pestaña Métricas → 4 usuarios/4 activos, 2 sedes/2 activas, roles ADMIN 2 / ESTUDIANTE 1 / SUPERADMIN 1; actividad 1 práctica, 1 simulacro, **promedio 1000**, 2 respuestas, 2 hoy; serie de **7 filas** con hoy 05-10 → 1/1 | ✅ |
| RBAC inverso: estudiante → `/institucion.html` y Admin Institución → `/admin.html` → redirigidos al inicio; enlace «Mi sede» visible solo para `ADMIN_INSTITUCION` y «Administración» oculto para él | ✅ |
| Regresión: `/admin.html` (6 pestañas, RF-05/RF-06 con sedes y admin en tablas), `/avance.html` (RF-13: Números 100 %, global 25 %, historial prácticas+simulacro 1000) | ✅ |
| Consola del navegador | ✅ 0 errores en `admin.html` e `institucion.html` (las 3 pestañas) |
| Limpieza de datos de prueba | ✅ BD en 0 usuarios / instituciones / calendario / contenido / simulacros / historial / respuestas / progreso |

**Estado al cierre de la Fase 4:** RF-07 ✅✔️ · RF-14 ✅✔️ · RF-16 ✅✔️ ·
RF-17 ✅✔️ · CP-09/10/19/20 ✅ · RNF-07 🔧 (falta cobertura ≥ 80 %).
Pendiente: Fase 5 (RF-15 publicidad + pulido).

## 2026-10-05 — Fase 5: publicidad Free y pulido (RF-15 + cierre CP + OWASP)

**Alcance:** publicidad segmentada exclusivamente para cuentas Free (RF-15 /
CP-21), cierre de las pruebas CP pendientes, pulido OWASP prometido en la
ADR-003 (rate limiting de login y cabeceras anti-cache) y verificación de los
RNF medibles localmente (latencia, cobertura, accesibilidad, auditoría).

**Decisiones (sin ADR nuevo; se apoyan en ADR-001/003):**

- **RF-15 — segmentación en el servidor:** `GET /api/publicidad` exige sesión
  y consulta la modalidad de la cuenta (`tipo_suscripcion`): solo `FREE`
  recibe el catálogo; `INSTITUCIONAL` (estudiante de sede y Admin) recibe
  `[]`. El criterio es la **modalidad**, tal como la define el RF (el informe
  no distingue roles dentro de la modalidad Free).
- **Catálogo semilla local:** anuncios de CFT/IP en
  `services/publicidad.service.js` con `Object.freeze`, puramente
  informativos y **sin enlaces externos** (proyecto 100 % local, ADR-001: no
  se integra ninguna red publicitaria en el MVP). Rotación simple por visita.
- **Defensa en profundidad en el frontend:** el banner vive en un
  `<aside id="publicidad">` **oculto** que solo se pinta si el servidor envía
  anuncios; `js/publicidad.js` se incluye únicamente en la landing y las 4
  páginas de estudio. `admin.html`/`institucion.html` no cargan ni el script
  ni el contenedor (la interfaz B2B queda libre de anuncios por construcción).
  Sin sesión o con error, el contenedor permanece oculto sin romper la página.
- **Pulido OWASP (cerrando la deuda de la ADR-003):**
  - `crearLimitarLogin` (nuevo `middleware/security.middleware.js`):
    10 intentos **fallidos** por clave `IP + correo` en 15 min → **429** con
    `Retry-After`; el listener `res.on('finish')` solo cuenta los 401 y un
    200 limpia la clave (el usuario legítimo nunca queda bloqueado). Estado
    en memoria por proceso (fábrica por aplicación), **cero dependencias
    nuevas**; si en producción hay varios procesos o reverse proxy, el
    ADR-004 de deploy evaluará un store externo — alcance documentado.
  - `noStore`: `Cache-Control: no-store, private` + `Pragma: no-cache` en
    todas las respuestas de `/api/auth/*` (`router.use` antes de las rutas).
- **Pulido de cobertura (RNF-07):** la Fase 2 nunca ejercitó las ediciones
  del CRUD de contenido → bloque nuevo en `fase5.test.js` que crea un eje, lo
  edita (incl. 409 por duplicado contra otro eje), edita lección con cambio de
  eje/URL/orden, obtiene y edita ejercicios con reemplazo de alternativas,
  filtra listados y verifica los 404. La cobertura subió de 79,25 % a
  **90,22 % líneas** (88,02 % stmts).
- **Instrumentación de calidad:** `npm run test:coverage` (suite completa con
  informe) y `npm run benchmark` (script propio con `fetch` nativo; usa
  credenciales reales de login si se pasan por entorno, para medir la ruta
  completa con Argon2). Resultado: **peor p95 = 31,6 ms** en 6 rutas × 50
  solicitudes, contra la meta de 2,0 s (RNF-01).
- **A11y (RNF-05):** Lighthouse detectó `heading-order` (h1 → h3) heredado de
  la Fase 3 → las tarjetas de ejes ahora son `h2` (con `font-size` equivalente
  en CSS) y «Ejercicios disponibles» pasó a `h2`; landing y 4 páginas de
  estudio quedan en 100/100.

**Incidencias (fase 5):**

27. `fase5.test.js` importaba `../src/app` estando en `tests/integration/` →
    «Cannot find module»; corregido a `../../src/app` (las suites viven dos
    niveles más abajo).
28. El `POST /admin/instituciones` del fixture devolvió **400**: el RUT
    `sede-f5-<13 dígitos>` tenía 21 caracteres y el validador exige máx. 20
    (en la Fase 4 `norte-`+13 = 19 pasaba). Acortado a `f5-`.
29. El `afterAll` de pulido falló por FK al borrar el eje: la lección se había
    renombrado a «… (editada)» y el `DELETE … WHERE titulo = $1` exacto no la
    encontraba → `LIKE` con el prefijo. Además, la primera aserción del
    bloque (POST de eje duplicado → 409) recibió **400** porque el controller
    exige `descripcion` también en la repetición
    (`validarObligatorio(descripcion ?? '')` falla con cadena vacía) → el
    segundo POST incluye descripción. El fallo del `afterAll` ensució las
    suites de las Fases 3-4 (ejes huérfanos → `toHaveLength(4)` recibió 6):
    se limpió la BD con un script temporal (SIMULACRO → CONTENIDO → EJE →
    USUARIO → INSTITUCION) y se eliminó.
30. `UnknownVizError` volvió al hacer clic tras `fill_form` → patrón ya
    conocido: re-snapshot con reintento justo antes del clic. Añadido: un
    `wait condition: textGone` con texto que no existe en la página devuelve
    inmediatamente sin esperar nada → usar siempre textos propios de la
    página de destino.
31. `node -e` con comillas dobles se rompe en PowerShell 5.1 (las elimina al
    pasar el argumento) → la verificación E2E del OWASP se hizo con un script
    temporal en archivo (mismo aprendizaje que con `\$1`).
32. `browser.screenshot` exige la pestaña enfocada **y** la ventana visible
    del escritorio, que no estaba disponible → evidencia por DOM/árbol de
    accesibilidad en lugar de imagen.

**Verificación (backend):**

| Verificación | Resultado |
|---|---|
| `npm run lint` (backend + frontend) | ✅ 0 errores |
| `npm test` (unitarias; + `tests/publicidad.test.js`) | ✅ 17/17 |
| `npm run test:db` (esquema 14 tablas + auth + RBAC + fases 2-5) | ✅ 82/82 |
| **Total de pruebas** | ✅ **99/99** |
| `npm run test:coverage` | ✅ 88,02 % stmts / 90,22 % líneas (meta ≥ 80 %) |
| `npm run benchmark` (6 rutas × 50 solicitudes) | ✅ peor p95 = 31,6 ms (meta ≤ 2,0 s) |
| `npm audit` | ✅ 0 vulnerabilidades |
| CP-21 (nivel S) + pulido CRUD RF-08/09/10 + OWASP (nivel I) | ✅ con verificación en BD |

**Verificación (frontend, navegador real sobre `http://127.0.0.1:3000`):**

| Flujo | Resultado |
|---|---|
| **CP-21 (anónimo):** landing → `<aside id="publicidad">` oculto y vacío | ✅ |
| **CP-21 (Free):** registro por UI (regresión CP-01) → banner visible en la landing («CFT Puerto Norte…») y en `/contenido.html` («IP Pacífico Sur…», rotación), 4 ejes con `h2` | ✅ |
| **CP-21 (Institucional):** estudiante de sede → contenedor presente pero **oculto/vacío** en `/contenido.html` (el servidor devuelve `[]`) | ✅ |
| **CP-21 (interfaz B2B):** Admin de Institución → `/institucion.html` **sin elemento ni script** de publicidad (3 pestañas cargan); `/admin.html` sin contenedor (RBAC lo manda al inicio) | ✅ |
| **OWASP E2E:** `GET /api/auth/sesion` → `Cache-Control: no-store, private`; 11.º login fallido → **429 + `Retry-After: 900`**; otra cuenta desde la misma IP → 200 | ✅ |
| **RNF-05:** Lighthouse en landing / contenido / ejercicios / avance → **100 accesibilidad, 100 best practices, 0 fallos** (tras el fix de `heading-order`) | ✅ |
| Regresión: banner sin errores de consola (0), ejes/lecciones y RBAC sin cambios | ✅ |
| Limpieza de datos de prueba | ✅ `db:reset` → esquema 14 tablas / 30 índices, 0 usuarios |

**Estado al cierre de la Fase 5:** RF-15 ✅✔️ · **CP-01…CP-22 todos ✅** ·
RNF-01 ✅ · RNF-03 ✅✔️ · RNF-05 ✅✔️ · RNF-07 ✅✔️ · RNF-06 🔧 (solo
Chromium disponible en el entorno). Queda para producción: RNF-04
(disponibilidad) y el ADR-004 de deploy (proveedor de correo, `secure` de
cookies, store del rate limiting tras reverse proxy). **Fases 0-5
completadas: 18/18 RF implementados y verificados.**

---

## 2026-10-07 — Preparación del build de producción

- Se consolidó React/Vite como frontend activo. La interfaz HTML anterior se
  movió fuera de `frontend/public` para que Vite no la publique; las capturas
  antiguas quedan identificadas como históricas y se quitaron sus credenciales.
- Se configuró el envío SMTP de recuperación en producción y validaciones de
  arranque para secreto JWT, HTTPS, correo, base de datos y build. Express
  escucha en loopback y solo confía en el proxy declarado.
- Se bloqueó `db:reset` en producción y se alinearon los promedios institucionales
  con la cohorte completa, contando progreso no registrado como cero.
- Se actualizaron Vite, su plugin React, React Router y KaTeX; las rutas React
  se compilan en fragmentos de carga diferida.
- Verificación local: 99/99 pruebas, lint sin errores, build correcto, auditoría
  frontend sin hallazgos y auditoría de dependencias de producción del backend
  sin hallazgos. Métricas en Anexo H.
- Aún requieren el destino real: dominio/TLS, SMTP verificado, copias y
  restauración, alertas de disponibilidad, revisión legal de privacidad y
  pruebas en Firefox/Edge/Safari.
