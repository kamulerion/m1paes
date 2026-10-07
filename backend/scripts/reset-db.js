'use strict';

/**
 * Reconecta la base de datos de desarrollo y carga el esquema oficial:
 *   1. DROP/CREATE de la base "m1paes" (PostgreSQL 13+).
 *   2. Ejecución de db/schema.sql (esquema v3.0 del informe).
 *   3. Verificación de las 14 tablas (13 del informe v3 + CALENDARIO_ENSAYO).
 *
 * Uso: npm run db:reset
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const config = require('../src/config');

if (config.env === 'production') {
  console.error('[db:reset] Operación bloqueada en producción: este script elimina y recrea la base de datos.');
  process.exit(1);
}

const SCHEMA_PATH = path.join(__dirname, '..', '..', 'db', 'schema.sql');
const DB_NAME = config.db.database;
const ADMIN_DB = process.env.DB_ADMIN_NAME || 'postgres';

if (!/^[a-z_][a-z0-9_]*$/i.test(DB_NAME)) {
  console.error(`[db:reset] nombre de base de datos inválido: "${DB_NAME}"`);
  process.exit(1);
}

function connect(database) {
  const client = new Client({
    host: config.db.host,
    port: config.db.port,
    database,
    user: config.db.user,
    password: config.db.password,
    connectionTimeoutMillis: 5000,
  });
  return client.connect().then(() => client);
}

async function main() {
  console.log(`[db:reset] Reconectando "${DB_NAME}" en ${config.db.host}:${config.db.port}...`);

  let admin;
  try {
    admin = await connect(ADMIN_DB);
  } catch (err) {
    console.error(`[db:reset] No se pudo conectar a PostgreSQL (${ADMIN_DB}): ${err.message}`);
    console.error('[db:reset] ¿Está el servicio postgresql-x64-17 en ejecución y correctas las credenciales de .env?');
    process.exit(1);
  }

  await admin.query(`DROP DATABASE IF EXISTS "${DB_NAME}" WITH (FORCE)`);
  await admin.query(`CREATE DATABASE "${DB_NAME}"`);
  await admin.end();
  console.log(`[db:reset] Base "${DB_NAME}" creada.`);

  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  const db = await connect(DB_NAME);
  await db.query(sql);

  const { rows } = await db.query(
    "SELECT count(*)::int AS total FROM information_schema.tables " +
      "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
  );
  const { rows: indexRows } = await db.query(
    "SELECT count(*)::int AS total FROM pg_indexes WHERE schemaname = 'public'"
  );
  await db.end();

  console.log(`[db:reset] Esquema cargado: ${rows[0].total} tablas, ${indexRows[0].total} índices.`);
  console.log('[db:reset] Listo. Ejecuta `npm run test:db` para verificar.');
}

main().catch((err) => {
  console.error('[db:reset] ERROR:', err.message);
  process.exit(1);
});
