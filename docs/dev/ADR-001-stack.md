# ADR-001: Stack tecnológico del MVP

- **Estado:** Aceptado
- **Fecha:** 2026-10-03
- **Fase:** 0 — Andamiaje
- **Relacionado:** Informe v3, secciones 5.2 (RNF-07), 7 y 9.

## Contexto

El informe v3 fija una arquitectura cliente-servidor en 3 capas sobre
Node.js/Express y PostgreSQL, con interfaz web. La primera implementación se
hizo en HTML/CSS/JavaScript puro; la interfaz activa se migró posteriormente a
React/Vite. Las páginas anteriores se conservan en
`frontend/legacy-static-prototype/` y no se publican.

## Decisión

| Área | Decisión |
|---|---|
| Runtime | Node.js 24 (LTS) — ya disponible en la máquina |
| API | Express **5** (manejo nativo de promesas en rutas async) |
| Lenguaje JS | **CommonJS** — compatibilidad estable con Jest sin flags experimentales |
| Persistencia | `pg` con **SQL explícito** + capa Repository (sin ORM) |
| Seguridad HTTP | `helmet`; CORS solo con `CORS_ORIGIN` explícito (por defecto: mismo origen) |
| Frontend | React 18 + Vite; la API Express sirve el build estático desde `frontend/dist` |
| Tests | Jest + Supertest; tests de BD separados (`tests/db`, `npm run test:db`) |
| Lint | ESLint 9 (configuración plana) + reglas `eqeqeq`, `prefer-const` |
| Estructura | `routes → controllers → repositories → db/pool` (MVC + Repository) |

## Alternativas descartadas

- **Vue:** alternativa evaluada; React ya es la interfaz activa y cuenta con
  componentes compartidos, rutas y diseño responsive.
- **ORM (Prisma/Sequelize):** el informe modela en 3FN con MER propio; el SQL
  explícito mantiene la trazabilidad informe ↔ esquema y evita *mismatch* de
  migraciones. Se puede reconsiderar si el mapeo se vuelve costoso.
- **TypeScript:** valor real pero fuera de lo declarado; posible en una fase
  posterior sin reescritura mayor.
- **Express 4:** Express 5 ya es estable y elimina el patrón `try/catch` repetido
  en cada ruta async.
- **SQLite / PG embebido:** no representativos del servidor dedicado de
  producción (ver ADR-002).

## Consecuencias

- Los tests unitarios corren sin base de datos ni flags especiales.
- Para producción, el build de Vite debe generarse antes de iniciar la API. En
  desarrollo, Vite corre en el puerto 5173 y proxya `/api` al backend.
- Hay que mantener la disciplina de no escribir SQL fuera de `repositories/`.
