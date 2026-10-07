# ADR-003: Autenticación — hash de contraseñas y estrategia de sesión

- **Estado:** Aceptado
- **Fecha:** 2026-10-03
- **Fase:** 1 — Autenticación y RBAC (RF-01 … RF-04)
- **Relacionado:** Informe v3, RNF-02 (hash y tokens sobre HTTPS), RNF-03 (OWASP),
  RF-01/02/03/04, CP-01 … CP-06 y CP-22.

## Contexto

La Fase 1 implementa el autoregistro del Estudiante Free, el inicio/cierre de
sesión de los 3 perfiles, la recuperación de contraseña y la edición del perfil
propio. Restricciones del proyecto:

- El informe v3 fija «bcrypt con sal aleatoria **o** Argon2» y «los tokens de
  sesión deben operar bajo HTTPS» (RNF-02), sin cerrar la elección.
- El esquema publicado (MER v1.1 + esquema v3.0) tiene **13 tablas**: la
  coherencia informe ↔ BD ↔ tests depende de no alterarlo sin actualizar todo
  el rastro documental (informe, MER, test de esquema). *Única excepción hasta
  ahora:* la Fase 4 añadió `CALENDARIO_ENSAYO` (14.ª tabla) para el RF-16, que
  el informe no modela; la extensión quedó documentada en la bitácora, en el
  encabezado de `db/schema.sql` y en el test de esquema, sin tocar las 13
  tablas originales.
- Frontend React servido por la **misma API** (mismo origen), lo que reduce el
  riesgo CSRF y habilita cookies `sameSite`.
- Trabajo 100 % local hasta el deploy (mismo principio del ADR-002).

## Decisión

### 1. Hash de contraseñas: **Argon2id**

- Algoritmo **Argon2id** (recomendación actual del OWASP Password Storage
  Cheat Sheet), parámetros por defecto de la librería alineados a OWASP
  (m ≈ 19 MiB, t = 2, p = 1), sal aleatoria por contraseña.
- Librería: **`@node-rs/argon2`** — binarios precompilados vía N-API que se
  descargan desde npm (sin node-gyp/Visual Studio en Windows, sin scripts de
  compilación que npm deba aprobar).
- El hash codificado (parámetros + sal + digest) cabe en
  `USUARIO.password_hash VARCHAR(255)` → **sin cambios de esquema**.

### 2. Sesión: **JWT firmado (HS256) en cookie `httpOnly`**

- El JWT contiene `sub` (id_usuario), `rol` y `exp`; se firma con `JWT_SECRET`
  y se entrega en la cookie `m1paes_sesion` con:
  `httpOnly` (inaccesible desde JS → mitiga XSS), `sameSite=Lax`
  (bloquea CSRF en peticiones cross-site), `secure` **solo** cuando
  `NODE_ENV=production` (HTTPS, RNF-02), `path=/`.
- **TTL: 8 h** configurable (`JWT_EXPIRES_HOURS`).
- `JWT_SECRET`: ≥ 32 bytes aleatorios (64 caracteres hexadecimales), generado una vez y guardado en
  `backend/.env` (gitignored). En desarrollo, si no existe se genera uno
  efímero al arrancar (las sesiones no sobreviven reinicios); en **producción
  el arranque falla si falta o es corto** (fail-fast).
- Logout: se limpia la cookie. Los datos protegidos se sirven solo con
  `authenticate` + `requireRole` (401 sin sesión, 403 con rol distinto → CP-22).

### 3. Endpoints (arquitectura en 3 capas, ADR-001)

| Método | Ruta | Requisito | Notas |
|---|---|---|---|
| POST | `/api/auth/registro` | RF-01 | Solo crea Estudiante Free; no inicia sesión (CP-01 → redirect a login) |
| POST | `/api/auth/login` | RF-02 | Respuesta genérica ante cualquier fallo (CP-03) |
| POST | `/api/auth/logout` | RF-02 | Limpia la cookie (CP-04) |
| GET | `/api/auth/sesion` | RF-02 | Devuelve el usuario de la sesión vigente o 401 |
| POST | `/api/auth/recuperar` | RF-03 | Respuesta única sí/no exista el correo (sin enumeración) |
| POST | `/api/auth/restablecer` | RF-03 | Token de un solo uso, 30 min (tabla existente `TOKEN_RECUPERACION`) |
| GET/PUT | `/api/perfil` | RF-04 | Solo el propio usuario autenticado |
| GET | `/api/admin/panel` | RF-02/RBAC | Guardián `requireRole('SUPERADMIN')` (CP-22) |

### 4. Controles de seguridad incluidos

- Comparación **siempre igual timing**: si el correo no existe se verifica
  contra un hash ficticio para no delatar la ausencia del usuario.
- Políticas de contraseña: **mínimo 8 caracteres** + validación de correo.
- Consultas 100 % parametrizadas (`pg`), mensajes de error genéricos en 5xx.
- Errores de negocio con `AppError` (409 correo duplicado, 400 token inválido…).
- Tokens de recuperación: 32 bytes aleatorios en hex, un solo uso, caducan en
  30 min, se marcan `utilizado` (modelo del informe, tabla ya existente).

### 5. Correo

Sin servidor SMTP local, el «correo» se materializa en un servicio `mailer`
que en desarrollo escribe en la consola del servidor y, **solo fuera de
producción**, devuelve el token en la respuesta para poder automatizar CP-05.
En producción el servicio envía el correo por la API HTTPS de Resend. El
arranque exige `RESEND_API_KEY`, `EMAIL_FROM` y un `APP_BASE_URL` HTTPS.
El servicio no devuelve el token en respuestas de producción; errores de envío
se registran como fallos de la solicitud y pueden reintentarse.

## Alternativas descartadas

- **bcrypt / bcryptjs:** permitidos por el informe, pero Argon2id resiste
  mejor ataques por hardware (GPU/ASIC); `bcrypt` además exige compilar en
  Windows y `bcryptjs` no es resistente a memoria.
- **JWT en `localStorage`:** accesible desde JavaScript → expuesto ante XSS,
  contrario a RNF-03.
- **Sesión server-side (tabla nueva):** revocación inmediata, pero obligaría a
  una 14ª tabla y a regenerar informe, MER y test de esquema; decisión del
  equipo no alterar el modelo publicado. Se reevalúa si surge revocación real.
- **`express-session`:** otra dependencia y store que manejar sin aportar más
  que la cookie firmada ya descrita.

## Consecuencias

- **Sin revocación inmediata:** un JWT válido no se invalida antes de su TTL
  (8 h). Mitigaciones: TTL corto, logout limpia cookie y los cambios de
  contraseña/estado no se reflejan hasta renovar sesión. Si el informe exige
  corte instantáneo, se añadirá una tabla de sesiones (nuevo ADR).
- En desarrollo las sesiones se pierden al reiniciar la API (secret efímero
  solo si `JWT_SECRET` no está definido).
- **Resuelto en la Fase 5 (pulido OWASP):** límite de intentos de login —
  `crearLimitarLogin` en `middleware/security.middleware.js`: 10 intentos
  fallidos por `IP + correo` en 15 min → **429** con `Retry-After` (un login
  válido limpia el contador; estado en memoria por proceso, sin dependencias;
  store externo quedará a cargo del ADR-004 si en producción hay varios
  procesos o reverse proxy) — y cabeceras anti-cache: `Cache-Control:
  no-store, private` + `Pragma: no-cache` en todas las respuestas de
  `/api/auth/*`.
- La cookie `secure=true` solo funciona sobre HTTPS: en el servidor dedicado
  deberá configurarse TLS (RNF-02) antes de `NODE_ENV=production`.
