'use strict';

/**
 * Pruebas de integración de la Fase 1 (API + BD): RF-01 … RF-04.
 * Cubren los casos CP-01 … CP-06 del plan de pruebas.
 * Se ejecutan con `npm run test:db` (requieren PostgreSQL con el esquema).
 */
const request = require('supertest');
const { createApp } = require('../../src/app');
const { query, close } = require('../../src/db/pool');

const app = createApp();

// Sufijo único por ejecución para no colisionar con usuarios de corridas previas.
const SUFIJO = Date.now().toString();
const CORREO = `fase1.registro.${SUFIJO}@m1paes.test`;
const CORREO_OTRO = `fase1.otro.${SUFIJO}@m1paes.test`;
const CORREO_NUEVO = `fase1.editado.${SUFIJO}@m1paes.test`;
const CLAVE = 'clave_secreta_123';
const CLAVE_NUEVA = 'nueva_clave_2026'; // la que queda tras la recuperación (CP-05)

// Agente con cookie persistente: mantiene la sesión entre peticiones (CP-02 → CP-06).
const agente = request.agent(app);

afterAll(async () => {
  // Limpieza de los usuarios creados por esta suite (TOKEN_RECUPERACION cae en cascada).
  await query('DELETE FROM USUARIO WHERE correo LIKE $1', [`%.${SUFIJO}@m1paes.test`]);
  await close();
});

describe('RF-01 — Autoregistro del Estudiante Free (CP-01)', () => {
  test('crea la cuenta con hash Argon2id, rol ESTUDIANTE y sin iniciar sesión', async () => {
    const res = await request(app).post('/api/auth/registro').send({
      nombre: 'Estudiante Fase 1',
      correo: CORREO.toUpperCase(), // la normalización a minúsculas debe aplicarse
      password: CLAVE,
    });

    expect(res.status).toBe(201);
    expect(res.body.usuario).toMatchObject({ correo: CORREO, rol: 'ESTUDIANTE' });
    expect(res.body.redireccion).toBe('/login');
    expect(JSON.stringify(res.body)).not.toContain(CLAVE);
    // CP-01: la creación no deja sesión iniciada (se redirige al login).
    expect(res.headers['set-cookie']).toBeUndefined();

    const { rows } = await query(
      'SELECT u.*, r.nombre_rol FROM USUARIO u JOIN ROL r ON r.id_rol = u.id_rol WHERE u.correo = $1',
      [CORREO]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].password_hash).toMatch(/^\$argon2id\$/); // contraseña cifrada
    expect(rows[0].password_hash).not.toContain(CLAVE);
    expect(rows[0].nombre_rol).toBe('ESTUDIANTE');
    expect(rows[0].tipo_suscripcion).toBe('FREE');
    expect(rows[0].id_institucion).toBeNull();
  });

  test('rechaza un correo ya registrado (409)', async () => {
    const res = await request(app).post('/api/auth/registro').send({
      nombre: 'Repetido',
      correo: CORREO,
      password: CLAVE,
    });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('El correo ya está registrado');
  });

  test('valida datos de entrada (400: correo inválido y contraseña corta)', async () => {
    const sinCorreo = await request(app)
      .post('/api/auth/registro')
      .send({ nombre: 'Mal Correo', correo: 'no-es-correo', password: CLAVE });
    expect(sinCorreo.status).toBe(400);

    const claveCorta = await request(app)
      .post('/api/auth/registro')
      .send({ nombre: 'Clave Corta', correo: `corta.${SUFIJO}@m1paes.test`, password: 'abc' });
    expect(claveCorta.status).toBe(400);
    expect(claveCorta.body.error.details.campos).toEqual(
      expect.arrayContaining([expect.stringContaining('8 caracteres')])
    );
  });
});

describe('RF-02 — Inicio y cierre de sesión (CP-02, CP-03, CP-04)', () => {
  test('CP-02: login válido devuelve cookie httpOnly + sameSite y la sesión ve el usuario', async () => {
    const login = await agente.post('/api/auth/login').send({ correo: CORREO, password: CLAVE });

    expect(login.status).toBe(200);
    expect(login.body.usuario).toMatchObject({ correo: CORREO, rol: 'ESTUDIANTE' });

    const cookies = login.headers['set-cookie'] || [];
    const sesionCookie = cookies.find((c) => c.startsWith('m1paes_sesion='));
    expect(sesionCookie).toBeDefined();
    expect(sesionCookie).toMatch(/HttpOnly/i);
    expect(sesionCookie).toMatch(/SameSite=Lax/i);
    expect(sesionCookie).toMatch(/Path=\//i);
    expect(sesionCookie).not.toMatch(/Secure/i); // solo en producción (HTTPS)

    const sesion = await agente.get('/api/auth/sesion');
    expect(sesion.status).toBe(200);
    expect(sesion.body.usuario.correo).toBe(CORREO);
    expect(sesion.body.usuario.password_hash).toBeUndefined();
  });

  test('CP-03: contraseña incorrecta o correo inexistente → mismo 401 genérico', async () => {
    const claveMala = await request(app)
      .post('/api/auth/login')
      .send({ correo: CORREO, password: 'contrasena_incorrecta' });
    const correoAjeno = await request(app)
      .post('/api/auth/login')
      .send({ correo: `nadie.${SUFIJO}@m1paes.test`, password: 'contrasena_incorrecta' });

    expect(claveMala.status).toBe(401);
    expect(correoAjeno.status).toBe(401);
    expect(claveMala.body.error.message).toBe('Credenciales inválidas');
    // El mensaje es idéntico en ambos casos: no revela si el correo existe.
    expect(correoAjeno.body.error.message).toBe(claveMala.body.error.message);
  });

  test('CP-04: logout limpia la cookie y la sesión deja de dar acceso', async () => {
    const cerrar = await agente.post('/api/auth/logout');
    expect(cerrar.status).toBe(200);
    expect((cerrar.headers['set-cookie'] || []).join(';')).toMatch(/m1paes_sesion=;/);

    const trasCerrar = await agente.get('/api/auth/sesion');
    expect(trasCerrar.status).toBe(401);
  });
});

describe('RF-03 — Recuperación de contraseña (CP-05)', () => {
  test('genera un token temporal de un solo uso con caducidad', async () => {
    const res = await request(app).post('/api/auth/recuperar').send({ correo: CORREO });

    expect(res.status).toBe(200);
    expect(res.body.mensaje).toBeTruthy();
    // En desarrollo el token se devuelve en la respuesta (ADR-003) para poder
    // automatizar la prueba sin servidor de correo.
    expect(res.body.token).toMatch(/^[0-9a-f]{64}$/);

    const { rows } = await query(
      'SELECT utilizado, expira_en FROM TOKEN_RECUPERACION WHERE token = $1',
      [res.body.token]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].utilizado).toBe(false);
    expect(new Date(rows[0].expira_en).getTime()).toBeGreaterThan(Date.now());
  });

  test('responde igual con un correo inexistente (sin entregar token)', async () => {
    const existente = await request(app).post('/api/auth/recuperar').send({ correo: CORREO });
    const inexistente = await request(app)
      .post('/api/auth/recuperar')
      .send({ correo: `nadie.${SUFIJO}@m1paes.test` });

    expect(inexistente.status).toBe(200);
    expect(inexistente.body.mensaje).toBe(existente.body.mensaje);
    expect(inexistente.body.token).toBeUndefined();
  });

  test('acepta el token, cambia la contraseña y lo vuelve inválido', async () => {
    const recuperar = await request(app).post('/api/auth/recuperar').send({ correo: CORREO });
    const token = recuperar.body.token;
    expect(token).toMatch(/^[0-9a-f]{64}$/);

    // Token inexistente → 400.
    const invalido = await request(app)
      .post('/api/auth/restablecer')
      .send({ token: 'f'.repeat(64), password: CLAVE_NUEVA });
    expect(invalido.status).toBe(400);

    // Token real → contraseña actualizada.
    const ok = await request(app)
      .post('/api/auth/restablecer')
      .send({ token, password: CLAVE_NUEVA });
    expect(ok.status).toBe(200);

    // Reutilización del mismo token → 400 (un solo uso).
    const reuso = await request(app)
      .post('/api/auth/restablecer')
      .send({ token, password: 'otra_clave_2026' });
    expect(reuso.status).toBe(400);

    // La clave anterior dejó de servir y la nueva entra.
    const vieja = await request(app).post('/api/auth/login').send({ correo: CORREO, password: CLAVE });
    expect(vieja.status).toBe(401);
    const nueva = await request(app)
      .post('/api/auth/login')
      .send({ correo: CORREO, password: CLAVE_NUEVA });
    expect(nueva.status).toBe(200);
  });
});

describe('RF-04 — Perfil propio (CP-06)', () => {
  // El CP-04 cerró la sesión y el CP-05 cambió la contraseña: se vuelve a
  // entrar con la clave nueva antes de probar el perfil.
  beforeAll(async () => {
    const login = await agente.post('/api/auth/login').send({ correo: CORREO, password: CLAVE_NUEVA });
    expect(login.status).toBe(200);
  });

  test('consulta el perfil del usuario autenticado', async () => {
    const res = await agente.get('/api/perfil');
    expect(res.status).toBe(200);
    expect(res.body.usuario.correo).toBe(CORREO);
    expect(res.body.usuario.password_hash).toBeUndefined();
  });

  test('edita el nombre y persiste el cambio', async () => {
    const editar = await agente.put('/api/perfil').send({ nombre: 'Nombre Editado Fase 1' });
    expect(editar.status).toBe(200);
    expect(editar.body.usuario.nombre).toBe('Nombre Editado Fase 1');

    const releer = await agente.get('/api/perfil');
    expect(releer.body.usuario.nombre).toBe('Nombre Editado Fase 1');
  });

  test('no permite adoptar el correo de otra cuenta (409) y sí el propio nuevo', async () => {
    const otro = await request(app).post('/api/auth/registro').send({
      nombre: 'Otro Usuario',
      correo: CORREO_OTRO,
      password: CLAVE,
    });
    expect(otro.status).toBe(201);

    const conflicto = await agente.put('/api/perfil').send({ correo: CORREO_OTRO });
    expect(conflicto.status).toBe(409);

    const propio = await agente.put('/api/perfil').send({ correo: CORREO_NUEVO });
    expect(propio.status).toBe(200);
    expect(propio.body.usuario.correo).toBe(CORREO_NUEVO);
  });

  test('sin sesión no hay perfil (401) y un cuerpo vacío es 400', async () => {
    const sinSesion = await request(app).get('/api/perfil');
    expect(sinSesion.status).toBe(401);

    const sinSesionPut = await request(app).put('/api/perfil').send({ nombre: 'Intento' });
    expect(sinSesionPut.status).toBe(401);

    const vacio = await agente.put('/api/perfil').send({});
    expect(vacio.status).toBe(400);
  });
});
