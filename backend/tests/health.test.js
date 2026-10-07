'use strict';

const request = require('supertest');
const { createApp } = require('../src/app');

describe('GET /api/health', () => {
  const app = createApp();

  test('responde 200 con estado ok y metadatos', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('m1paes-api');
    expect(typeof res.body.version).toBe('string');
    expect(typeof res.body.uptimeSec).toBe('number');
  });

  test('responde 404 en formato JSON para rutas desconocidas', async () => {
    const res = await request(app).get('/api/ruta-que-no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error.status).toBe(404);
    expect(res.body.error.message).toMatch(/Ruta no encontrada/);
  });
});
