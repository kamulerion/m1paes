'use strict';

/**
 * Pruebas de integración contra la base de datos local.
 * Se ejecutan con `npm run test:db` (requieren PostgreSQL en ejecución
 * y el esquema cargado con `npm run db:reset`).
 */
const request = require('supertest');
const { createApp } = require('../../src/app');
const { query, close } = require('../../src/db/pool');

afterAll(async () => {
  await close();
});

describe('PostgreSQL local — esquema M1PAES', () => {
  test('el servidor responde a SELECT 1', async () => {
    const result = await query('SELECT 1 AS ok');
    expect(result.rows[0].ok).toBe(1);
  });

  test('el esquema crea exactamente 14 tablas (13 del informe v3 + CALENDARIO_ENSAYO del RF-16)', async () => {
    const result = await query(
      "SELECT count(*)::int AS total FROM information_schema.tables " +
        "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
    );
    expect(result.rows[0].total).toBe(14);
  });

  test('existen los 3 roles y los 4 ejes temáticos DEMRE (datos semilla)', async () => {
    const roles = await query('SELECT count(*)::int AS total FROM rol');
    expect(roles.rows[0].total).toBeGreaterThanOrEqual(3);

    const ejes = await query('SELECT count(*)::int AS total FROM eje_tematico');
    expect(ejes.rows[0].total).toBeGreaterThanOrEqual(4);
  });

  test('GET /api/health/db responde 200 con latencia', async () => {
    const res = await request(createApp()).get('/api/health/db');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.latencyMs).toBe('number');
  });
});
