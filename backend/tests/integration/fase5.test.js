'use strict';

/**
 * Pruebas de integración de la Fase 5:
 *  - RF-15 — publicidad segmentada (CP-21): el catálogo de anuncios se
 *    entrega a cuentas Free y nunca a cuentas Institucionales.
 *  - Pulido — CRUD administrativo de contenido (RF-08/09/10) que la Fase 2
 *    no ejercitó, para cerrar ramas sin cubrir y cumplir RNF-07 (≥ 80 %).
 * Se ejecutan con `npm run test:db` (requieren PostgreSQL con el esquema).
 */
const request = require('supertest');
const { createApp } = require('../../src/app');
const { query, close } = require('../../src/db/pool');
const usuarioRepository = require('../../src/repositories/usuario.repository');
const { hashPassword } = require('../../src/services/password.service');

const app = createApp();

const SUFIJO = Date.now().toString();
const CORREO_SUPER = `fase5.super.${SUFIJO}@m1paes.test`;
const CORREO_ADMIN = `fase5.admin.${SUFIJO}@m1paes.test`;
const CORREO_FREE = `fase5.free.${SUFIJO}@m1paes.test`;
const CLAVE = 'clave_fase5_12345';
const RUT = `f5-${SUFIJO}`; // máx. 20 caracteres (validador de RUT identificador)

// Fixtures del bloque de pulido (CRUD completo de contenido, RF-08/09/10).
const NOMBRE_EJE = `Eje Pulido F5 ${SUFIJO}`;
const TITULO_LECCION = `Lección Pulido F5 ${SUFIJO}`;
const NOMBRE_SIMULACRO = `Simulacro Pulido F5 ${SUFIJO}`;

const superadmin = request.agent(app);
const admin = request.agent(app);
const libre = request.agent(app);
const matriculado = request.agent(app);

let idInstitucion;
let idEje;
let idLeccion;
let idEjercicio;
let idSimulacro;

afterAll(async () => {
  // Orden por restricciones FK: simulacros, contenido (→ ejercicios y
  // alternativas), el eje creado en el pulido, usuarios e instituciones.
  await query('DELETE FROM SIMULACRO WHERE nombre = $1', [NOMBRE_SIMULACRO]);
  // LIKE: la lección puede haber quedado renombrada como "… (editada)".
  await query('DELETE FROM CONTENIDO WHERE titulo LIKE $1', [`${TITULO_LECCION}%`]);
  await query('DELETE FROM EJE_TEMATICO WHERE nombre = $1', [NOMBRE_EJE]);
  await query('DELETE FROM USUARIO WHERE correo LIKE $1', [`%.${SUFIJO}@m1paes.test`]);
  await query('DELETE FROM INSTITUCION WHERE rut_identificador = $1', [RUT]);
  await close();
});

describe('RF-15 — Publicidad segmentada por modalidad (CP-21)', () => {
  beforeAll(async () => {
    // Estudiante Free: registro público real (RF-01).
    const registro = await libre.post('/api/auth/registro').send({
      nombre: 'Estudiante Libre Fase 5',
      correo: CORREO_FREE,
      password: CLAVE,
    });
    expect(registro.status).toBe(201);
    expect((await libre.post('/api/auth/login').send({ correo: CORREO_FREE, password: CLAVE })).status).toBe(200);

    // Estudiante Institucional: alta real por su sede (RF-07, Fase 4).
    await usuarioRepository.crear({
      idRol: await usuarioRepository.idPorNombreRol('SUPERADMIN'),
      nombre: 'Superadmin Fase 5',
      correo: CORREO_SUPER,
      passwordHash: await hashPassword(CLAVE),
    });
    expect((await superadmin.post('/api/auth/login').send({ correo: CORREO_SUPER, password: CLAVE })).status).toBe(200);

    const sede = await superadmin.post('/api/admin/instituciones').send({
      nombre: `Sede Fase 5 ${SUFIJO}`,
      rut_identificador: RUT,
    });
    expect(sede.status).toBe(201);
    idInstitucion = sede.body.institucion.id_institucion;

    const adminCreado = await superadmin.post('/api/admin/administradores').send({
      nombre: 'Admin Fase 5',
      correo: CORREO_ADMIN,
      password: CLAVE,
      id_institucion: idInstitucion,
      cargo: 'Jefe de UTP',
    });
    expect(adminCreado.status).toBe(201);
    expect((await admin.post('/api/auth/login').send({ correo: CORREO_ADMIN, password: CLAVE })).status).toBe(200);

    const matricula = await admin.post('/api/institucion/estudiantes').send({
      nombre: 'Estudiante Matriculado Fase 5',
      correo: `fase5.matriculado.${SUFIJO}@m1paes.test`,
      password: CLAVE,
    });
    expect(matricula.status).toBe(201);
    // La matrícula garantiza la modalidad INSTITUCIONAL (RF-07).
    expect(matricula.body.estudiante.suscripcion).toBe('INSTITUCIONAL');
    expect(
      (await matriculado.post('/api/auth/login').send({
        correo: `fase5.matriculado.${SUFIJO}@m1paes.test`,
        password: CLAVE,
      })).status
    ).toBe(200);
  });

  test('sin sesión no se entrega publicidad (401)', async () => {
    const res = await request(app).get('/api/publicidad');
    expect(res.status).toBe(401);
  });

  test('la cuenta Free recibe el catálogo de anuncios CFT/IP', async () => {
    const res = await libre.get('/api/publicidad');
    expect(res.status).toBe(200);
    expect(res.body.anuncios.length).toBeGreaterThanOrEqual(1);
    const primero = res.body.anuncios[0];
    expect(primero).toMatchObject({
      id: expect.any(String),
      institucion: expect.stringMatching(/CFT|IP/),
      titulo: expect.any(String),
      texto: expect.any(String),
    });
  });

  test('la cuenta matriculada (INSTITUCIONAL) no recibe anuncios', async () => {
    const res = await matriculado.get('/api/publicidad');
    expect(res.status).toBe(200);
    expect(res.body.anuncios).toEqual([]);
  });

  test('el Admin de Institución (interfaz B2B) tampoco recibe anuncios', async () => {
    const res = await admin.get('/api/publicidad');
    expect(res.status).toBe(200);
    expect(res.body.anuncios).toEqual([]);
  });
});

/**
 * Pulido Fase 5 — cierre del CRUD administrativo de contenido que las pruebas
 * de la Fase 2 no alcanzaron a ejercitar (edición de ejes y lecciones, detalle
 * y edición de ejercicios, filtros y 404). Además de cerrar RF-08/09/10 a
 * nivel de API, eleva la cobertura del backend (RNF-07, ≥ 80 %).
 */
describe('Pulido Fase 5 — administración completa de contenido (RF-08/09/10)', () => {
  test('crea un eje, lo edita y valida duplicados/inexistentes', async () => {
    const crear = await superadmin.post('/api/admin/ejes').send({
      nombre: NOMBRE_EJE,
      descripcion: 'Eje creado durante el pulido de la Fase 5 para cerrar el CRUD de RF-08.',
    });
    expect(crear.status).toBe(201);
    idEje = crear.body.eje.id_eje;

    const dup = await superadmin.post('/api/admin/ejes').send({
      nombre: NOMBRE_EJE,
      descripcion: 'Segunda descripción para disparar el 409 de duplicado.',
    });
    expect(dup.status).toBe(409);

    const editar = await superadmin.put(`/api/admin/ejes/${idEje}`).send({
      descripcion: 'Descripción editada en el pulido de la Fase 5.',
    });
    expect(editar.status).toBe(200);
    expect(editar.body.eje.descripcion).toContain('editada');

    // Duplicado contra OTRO eje ya existente (camino de 409 en la edición).
    const listado = await superadmin.get('/api/admin/ejes');
    const otroEje = listado.body.ejes.find((e) => e.id_eje !== idEje);
    expect(otroEje).toBeDefined();
    const dupEdicion = await superadmin.put(`/api/admin/ejes/${idEje}`).send({ nombre: otroEje.nombre });
    expect(dupEdicion.status).toBe(409);

    const sinCambios = await superadmin.put(`/api/admin/ejes/${idEje}`).send({});
    expect(sinCambios.status).toBe(400);

    const inexistente = await superadmin.put('/api/admin/ejes/99999999').send({ nombre: 'Otro eje' });
    expect(inexistente.status).toBe(404);
  });

  test('publica y edita una lección, con filtros y validaciones (RF-08)', async () => {
    const crear = await superadmin.post('/api/admin/lecciones').send({
      id_eje: idEje,
      titulo: TITULO_LECCION,
      cuerpo_teoria: 'Cuerpo original del pulido F5 con más de diez caracteres.',
      orden: 1,
    });
    expect(crear.status).toBe(201);
    idLeccion = crear.body.leccion.id_contenido;

    const editar = await superadmin.put(`/api/admin/lecciones/${idLeccion}`).send({
      titulo: `${TITULO_LECCION} (editada)`,
      cuerpo_teoria: 'Cuerpo actualizado en el pulido de la Fase 5 con más de diez caracteres.',
      url_video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      orden: 2,
      id_eje: idEje,
    });
    expect(editar.status).toBe(200);
    expect(editar.body.leccion.titulo).toContain('(editada)');
    expect(editar.body.leccion.orden).toBe(2);

    const filtrado = await superadmin.get(`/api/admin/lecciones?id_eje=${idEje}`);
    expect(filtrado.status).toBe(200);
    expect(filtrado.body.lecciones.some((l) => l.id_contenido === idLeccion)).toBe(true);

    expect((await superadmin.get('/api/admin/lecciones?id_eje=99999999')).status).toBe(404);

    const inexistente = await superadmin.put('/api/admin/lecciones/99999999').send({ titulo: 'Sin soporte' });
    expect(inexistente.status).toBe(404);

    const ejeInvalido = await superadmin.put(`/api/admin/lecciones/${idLeccion}`).send({ id_eje: 99999999 });
    expect(ejeInvalido.status).toBe(400);
  });

  test('consulta, edita y filtra un ejercicio del banco (RF-09)', async () => {
    const crear = await superadmin.post('/api/admin/ejercicios').send({
      id_contenido: idLeccion,
      enunciado: `¿Cuánto es 6 × 7? Pulido F5 ${SUFIJO}`,
      explicacion_solucion: 'Explicación creada en el pulido de la Fase 5.',
      dificultad: 'FACIL',
      alternativas: ['40', '42', '44', '48'].map((texto, i) => ({ texto, es_correcta: i === 1 })),
    });
    expect(crear.status).toBe(201);
    idEjercicio = crear.body.ejercicio.id_ejercicio;

    const detalle = await superadmin.get(`/api/admin/ejercicios/${idEjercicio}`);
    expect(detalle.status).toBe(200);
    expect(detalle.body.ejercicio.alternativas).toHaveLength(4);

    const editar = await superadmin.put(`/api/admin/ejercicios/${idEjercicio}`).send({
      enunciado: `¿Cuánto es 7 × 6? Editado en F5 ${SUFIJO}`,
      explicacion_solucion: 'Explicación editada en el pulido de la Fase 5.',
      dificultad: 'MEDIA',
      alternativas: ['36', '42', '46', '49'].map((texto, i) => ({ texto, es_correcta: i === 1 })),
    });
    expect(editar.status).toBe(200);
    expect(editar.body.ejercicio.enunciado).toContain('Editado en F5');
    expect(editar.body.ejercicio.dificultad).toBe('MEDIA');
    expect(editar.body.ejercicio.alternativas.filter((a) => a.es_correcta)).toHaveLength(1);

    const filtrado = await superadmin.get(`/api/admin/ejercicios?id_contenido=${idLeccion}`);
    expect(filtrado.status).toBe(200);
    expect(filtrado.body.ejercicios.some((e) => e.id_ejercicio === idEjercicio)).toBe(true);

    expect((await superadmin.get('/api/admin/ejercicios?id_contenido=99999999')).status).toBe(404);
    expect((await superadmin.get('/api/admin/ejercicios/99999999')).status).toBe(404);

    const sinDatos = await superadmin.put(`/api/admin/ejercicios/${idEjercicio}`).send({});
    expect(sinDatos.status).toBe(400);

    const leccionInexistente = await superadmin.put(`/api/admin/ejercicios/${idEjercicio}`).send({
      id_contenido: 99999999,
      enunciado: `Enunciado válido para alcanzar la rama de lección inexistente ${SUFIJO}`,
      explicacion_solucion: 'Explicación válida para la rama de lección inexistente.',
      dificultad: 'MEDIA',
    });
    expect(leccionInexistente.status).toBe(400);
  });

  test('consulta la composición de un simulacro y sus 404 (RF-10)', async () => {
    const crear = await superadmin.post('/api/admin/simulacros').send({ nombre: NOMBRE_SIMULACRO });
    expect(crear.status).toBe(201);
    idSimulacro = crear.body.simulacro.id_simulacro;

    const preguntas = await superadmin.get(`/api/admin/simulacros/${idSimulacro}/preguntas`);
    expect(preguntas.status).toBe(200);
    expect(preguntas.body.preguntas).toEqual([]);

    expect((await superadmin.get('/api/admin/simulacros/99999999/preguntas')).status).toBe(404);
  });
});

/**
 * Pulido Fase 5 — promesas abiertas en la ADR-003: rate limiting de login
 * (anti fuerza bruta) y cabeceras anti-cache en las respuestas sensibles de
 * /api/auth (RNF-03, OWASP).
 */
describe('Pulido Fase 5 — OWASP (ADR-003): rate limiting y anti-cache', () => {
  const CORREO_BLOQUEO = `fase5.bloqueo.${SUFIJO}@m1paes.test`;
  const CLAVE_MALA = 'clave_incorrecta_12345';

  test('bloquea el login tras 10 intentos fallidos (429 + Retry-After)', async () => {
    for (let i = 0; i < 10; i += 1) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ correo: CORREO_BLOQUEO, password: CLAVE_MALA });
      expect(res.status).toBe(401);
    }

    const bloqueado = await request(app)
      .post('/api/auth/login')
      .send({ correo: CORREO_BLOQUEO, password: CLAVE_MALA });
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.headers['retry-after']).toBeDefined();

    // La clave es IP + correo: otra cuenta desde la misma IP no queda afectada.
    const otraCuenta = await request(app)
      .post('/api/auth/login')
      .send({ correo: CORREO_FREE, password: CLAVE });
    expect(otraCuenta.status).toBe(200);
  });

  test('las respuestas de /api/auth son anti-cache (no-store)', async () => {
    const sinSesion = await request(app).get('/api/auth/sesion');
    expect(sinSesion.headers['cache-control']).toContain('no-store');

    const login = await request(app)
      .post('/api/auth/login')
      .send({ correo: CORREO_FREE, password: CLAVE });
    expect(login.status).toBe(200);
    expect(login.headers['cache-control']).toContain('no-store');
    expect(login.headers.pragma).toBe('no-cache');
  });
});
