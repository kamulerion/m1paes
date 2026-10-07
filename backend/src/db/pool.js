'use strict';

/**
 * Capa de datos: pool de conexiones a PostgreSQL (RNF-07, patrón Repository).
 * Todas las consultas pasan por aquí; ningún controlador habla SQL directamente.
 */
const { Pool } = require('pg');
const config = require('../config');

const options = config.db.connectionString
  ? {
      connectionString: config.db.connectionString,
      max: config.db.max,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    }
  : {
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
      max: config.db.max,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    };

const pool = new Pool(options);

pool.on('error', (err) => {
  // Error asíncrono de cliente inactivo: no debe tumbar el proceso.
  console.error('[pg] error inesperado en el pool:', err.message);
});

async function query(text, params) {
  return pool.query(text, params);
}

/** Sondeo simple de salud (usado por GET /api/health/db). */
async function ping() {
  const start = Date.now();
  const result = await query('SELECT 1 AS ok');
  return { ok: result.rows[0]?.ok === 1, latencyMs: Date.now() - start };
}

/** Cierra el pool (usado en apagado ordenado y en tests). */
async function close() {
  await pool.end();
}

module.exports = { pool, query, ping, close };
