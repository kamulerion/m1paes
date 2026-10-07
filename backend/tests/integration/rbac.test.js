'use strict';

/**
 * CP-22 — RBAC: el panel de Superadmin exige el rol correcto.
 * Se ejecuta con `npm run test:db` (requiere PostgreSQL con el esquema).
 */
const request = require('supertest');
const { createApp } = require('../../src/app');
const { query, close } = require('../../src/db/pool');
const usuarioRepository = require('../../src/repositories/usuario.repository');
const { hashPassword } = require('../../src/services/password.service');

const app = createApp();

const SUFIJO = Date.now().toString();
const CORREO_ESTUDIANTE = `fase1.rbac.est.${SUFIJO}@m1paes.test`;
const CORREO_SUPER = `fase1.rbac.super.${SUFIJO}@m1paes.test`;
const CLAVE = 'clave_rbac_12345';

beforeAll(async () => {
  // El Superadmin se crea directamente en BD (su alta masiva es RF-05, Fase 2).
  await usuarioRepository.crear({
    idRol: await usuarioRepository.idPorNombreRol('SUPERADMIN'),
    nombre: 'Superadmin de prueba',
    correo: CORREO_SUPER,
    passwordHash: await hashPassword(CLAVE),
  });
});

afterAll(async () => {
  await query('DELETE FROM USUARIO WHERE correo LIKE $1', [`%.${SUFIJO}@m1paes.test`]);
  await close();
});

describe('CP-22 — RBAC sobre GET /api/admin/panel', () => {
  test('sin sesión → 401', async () => {
    const res = await request(app).get('/api/admin/panel');
    expect(res.status).toBe(401);
  });

  test('Estudiante autenticado → 403 (no ve el panel de Superadmin)', async () => {
    const registro = await request(app).post('/api/auth/registro').send({
      nombre: 'Estudiante RBAC',
      correo: CORREO_ESTUDIANTE,
      password: CLAVE,
    });
    expect(registro.status).toBe(201);

    const agente = request.agent(app);
    const login = await agente.post('/api/auth/login').send({
      correo: CORREO_ESTUDIANTE,
      password: CLAVE,
    });
    expect(login.status).toBe(200);

    const res = await agente.get('/api/admin/panel');
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('No tienes permiso para acceder a este recurso');
  });

  test('Superadmin autenticado → 200', async () => {
    const agente = request.agent(app);
    const login = await agente.post('/api/auth/login').send({ correo: CORREO_SUPER, password: CLAVE });
    expect(login.status).toBe(200);
    expect(login.body.usuario.rol).toBe('SUPERADMIN');

    const res = await agente.get('/api/admin/panel');
    expect(res.status).toBe(200);
    expect(res.body.usuario.rol).toBe('SUPERADMIN');
  });
});
