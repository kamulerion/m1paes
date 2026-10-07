# ADR-002: Base de datos — de desarrollo local a servidor dedicado

- **Estado:** Aceptado
- **Fecha:** 2026-10-03
- **Fase:** 0 — Andamiaje
- **Relacionado:** Informe v3, secciones 8.3 (esquema), 13 (RNF-04 ≥ 99,5 %).

## Contexto

El producto apunta a **miles de estudiantes e instituciones a nivel nacional**, con
meta de disponibilidad ≥ 99,5 % (RNF-04). El equipo trabaja **solo en local**: nada
de servicios externos hasta el despliegue en un servidor dedicado. No hay Docker
instalado en la máquina de desarrollo.

## Decisión

### Ahora (desarrollo local)

1. **PostgreSQL 17 real**, instalado con el instalador oficial (EDB) como
   *servicio de Windows* (`postgresql-x64-17`): mismo motor, mismas semánticas de
   SQL, índices y tipos que producción — sin sustitutos.
2. Base de datos de desarrollo: `m1paes` en `127.0.0.1:5432`, usuario `postgres`.
3. Credenciales **solo en `backend/.env`** (ignorado por Git). `.env.example`
   documenta la forma de las variables sin valores reales.
4. Esquema con fuente de verdad única en dev: `db/schema.sql` (v3.0 del informe
   + `CALENDARIO_ENSAYO` de la Fase 4 — extensión documentada en la bitácora).
   Recarga total con `npm run db:reset` (DROP/CREATE + verificación de 14 tablas).
5. Pool de conexiones con `max` configurable (`DB_POOL_MAX`, por defecto 10) y
   *connection timeout* de 5 s, desde la capa `backend/src/db/pool.js`.

### Producción (guía operativa en ADR-004)

- PostgreSQL en el servidor dedicado, **aislado de la capa de aplicación**
  (proceso/red propios), con acceso restringido por IP.
- Pool de conexiones de aplicación + **PgBouncer** si la concurrencia lo exige;
  limitar `max` por instancia de API.
- **Respaldos**: `pg_dump` diario + WAL archiving (PITR) y prueba periódica de
  restauración.
- **Monitoreo**: latencia de consultas, conexiones activas, disk/CPU; revisión de
  planes con `EXPLAIN (ANALYZE, BUFFERS)` en las rutas calientes.
- Escalamiento: vertical primero; **réplica de lectura** cuando el tráfico de
  lectura (contenidos, reportes) lo justifique.
- Ventana de mantenimiento alineada con las actualizaciones semestrales de
  contenidos (mantenimiento adaptativo del informe, sección 12).

## Alternativas descartadas

- **Docker/local:** Docker no está instalado en el equipo; además, en Windows con
  PostgreSQL de servicio se evita el costo de VM. Se re-evalúa si el equipo
  adopta contenedores.
- **Servicio gestionado en la nube ahora (Neon/Supabase/RDS):** requeriría sacar
  datos fuera de la computadora, contradiciendo la restricción de trabajo local
  hasta el deploy.
- **SQLite / embebidos:** violaría RNF-04 y no es representativo a escala.
- **pg embebido por npm:** datos dentro de `node_modules`, no apropiado como
  desarrollo de un producto real.

## Consecuencias

- Lo que funciona y rinde aquí es representativo del servidor dedicado.
- `db:reset` es destructivo por diseño: solo se usa en entornos de desarrollo
  (el script SQL lleva la advertencia explícita).
- La guía de despliegue y sus controles pendientes están en ADR-004 y
  `ADR-004-despliegue.md`. El acceso público sigue bloqueado hasta configurar
  copias y comprobar una restauración en el servidor de destino.
