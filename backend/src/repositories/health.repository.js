'use strict';

const { query } = require('../db/pool');

/** Verifica la conexión con SELECT 1 y mide la latencia. */
async function ping() {
  const start = Date.now();
  const result = await query('SELECT 1 AS ok');
  return { ok: result.rows[0]?.ok === 1, latencyMs: Date.now() - start };
}

module.exports = { ping };
