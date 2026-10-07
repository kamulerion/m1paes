'use strict';

/**
 * Pruebas de integración de la Fase 2: RF-05 (instituciones), RF-06
 * (administradores de sede), RF-08 (ejes/lecciones), RF-09 (ejercicios) y
 * RF-10 (simulacros). Cubren CP-07, CP-08, CP-11, CP-12 y CP-13.
 * Se ejecutan con `npm run test:db` (requieren PostgreSQL con el esquema).
 */
const request = require('supertest');
const { createApp } = require('../../src/app');
const { query, close } = require('../../src/db/pool');
const usuarioRepository = require('../../src/repositories/usuario.repository');
const { hashPassword } = require('../../src/services/password.service');

const app = createApp();

const SUFIJO = Date.now().toString();
const CORREO_SUPER = `fase2.super.${SUFIJO}@m1paes.test`;
const CORREO_ESTUDIANTE = `fase2.est.${SUFIJO}@m1paes.test`;
const CORREO_ADMIN = `fase2.admin.${SUFIJO}@m1paes.test`;
const CLAVE = 'clave_fase2_12345';

const superadmin = request.agent(app);
const estudiante = request.agent(app);
const adminSede = request.agent(app);

let idInstitucion;
let idLeccion;
let idEjercicio;
let idSimulacro;
let ejeId;

async function crearEjercicio(alternativas) {
  const res = await superadmin.post('/api/admin/ejercicios').send({
    id_contenido: idLeccion,
    enunciado: `Enunciado de prueba para el ejercicio ${SUFIJO}`,
    explicacion_solucion: 'Explicación de la solución usada por las pruebas de la fase 2.',
    dificultad: 'MEDIA',
    alternativas,
  });
  return res;
}

beforeAll(async () => {
  await usuarioRepository.crear({
    idRol: await usuarioRepository.idPorNombreRol('SUPERADMIN'),
    nombre: 'Superadmin Fase 2',
    correo: CORREO_SUPER,
    passwordHash: await hashPassword(CLAVE),
  });
  await usuarioRepository.crear({
    idRol: await usuarioRepository.idPorNombreRol('ESTUDIANTE'),
    nombre: 'Estudiante Fase 2',
    correo: CORREO_ESTUDIANTE,
    passwordHash: await hashPassword(CLAVE),
  });

  expect((await superadmin.post('/api/auth/login').send({ correo: CORREO_SUPER, password: CLAVE })).status).toBe(200);
  expect(
    (await estudiante.post('/api/auth/login').send({ correo: CORREO_ESTUDIANTE, password: CLAVE })).status
  ).toBe(200);

  const { rows } = await query('SELECT id_eje FROM EJE_TEMATICO ORDER BY id_eje LIMIT 1');
  ejeId = rows[0].id_eje;
});

afterAll(async () => {
  // Orden por restricciones FK: simulacros (→ composición), contenido
  // (→ ejercicios/alternativas), usuarios y por último instituciones.
  await query('DELETE FROM SIMULACRO WHERE nombre LIKE $1', [`% ${SUFIJO}`]);
  await query('DELETE FROM CONTENIDO WHERE titulo LIKE $1', [`% ${SUFIJO}`]);
  await query('DELETE FROM USUARIO WHERE correo LIKE $1', [`%.${SUFIJO}@m1paes.test`]);
  await query('DELETE FROM INSTITUCION WHERE rut_identificador = $1', [`rut-${SUFIJO}`]);
  await close();
});

describe('RF-05 — CRUD de instituciones (CP-07)', () => {
  test('el Superadmin crea una institución y aparece en su listado', async () => {
    const crear = await superadmin.post('/api/admin/instituciones').send({
      nombre: `Liceo Fase 2 ${SUFIJO}`,
      rut_identificador: `rut-${SUFIJO}`,
      convenio_tipo: 'B2B_PREMIUM',
    });
    expect(crear.status).toBe(201);
    expect(crear.body.institucion.activo).toBe(true);
    idInstitucion = crear.body.institucion.id_institucion;

    const listado = await superadmin.get('/api/admin/instituciones');
    expect(listado.status).toBe(200);
    const encontrada = listado.body.instituciones.find(
      (i) => i.id_institucion === idInstitucion
    );
    expect(encontrada).toMatchObject({
      nombre: `Liceo Fase 2 ${SUFIJO}`,
      rut_identificador: `rut-${SUFIJO}`,
      activo: true,
      usuarios: 0,
    });
  });

  test('edita la institución y el cambio persiste en el listado', async () => {
    const editar = await superadmin
      .put(`/api/admin/instituciones/${idInstitucion}`)
      .send({ nombre: `Liceo Editado ${SUFIJO}`, convenio_tipo: 'B2B_BASIC' });
    expect(editar.status).toBe(200);
    expect(editar.body.institucion.nombre).toBe(`Liceo Editado ${SUFIJO}`);

    const listado = await superadmin.get('/api/admin/instituciones');
    const encontrada = listado.body.instituciones.find((i) => i.id_institucion === idInstitucion);
    expect(encontrada.convenio_tipo).toBe('B2B_BASIC');
  });

  test('rechaza un RUT duplicado (409) y un id inexistente (404)', async () => {
    const duplicado = await superadmin.post('/api/admin/instituciones').send({
      nombre: 'Otra institución',
      rut_identificador: `rut-${SUFIJO}`,
    });
    expect(duplicado.status).toBe(409);

    const inexistente = await superadmin
      .put('/api/admin/instituciones/99999999')
      .send({ nombre: 'No existe' });
    expect(inexistente.status).toBe(404);
  });

  test('un Estudiante no accede al CRUD de instituciones (403)', async () => {
    const res = await estudiante.get('/api/admin/instituciones');
    expect(res.status).toBe(403);
  });
});

describe('RF-06 — Administradores de Institución (CP-08)', () => {
  test('crea un administrador con rol, sede y trazabilidad correctos', async () => {
    const crear = await superadmin.post('/api/admin/administradores').send({
      nombre: 'Admin de Sede Fase 2',
      correo: CORREO_ADMIN,
      password: CLAVE,
      id_institucion: idInstitucion,
      cargo: 'Jefe de UTP',
    });
    expect(crear.status).toBe(201);
    expect(crear.body.administrador).toMatchObject({
      rol: 'ADMIN_INSTITUCION',
      cargo: 'Jefe de UTP',
      suscripcion: 'INSTITUCIONAL',
      idInstitucion: idInstitucion,
    });

    // CP-08: verificación directa de rol y asociación en la base de datos.
    const { rows } = await query(
      'SELECT u.*, r.nombre_rol FROM USUARIO u JOIN ROL r ON r.id_rol = u.id_rol WHERE u.correo = $1',
      [CORREO_ADMIN]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].nombre_rol).toBe('ADMIN_INSTITUCION');
    expect(rows[0].id_institucion).toBe(idInstitucion);
    expect(rows[0].id_usuario_creador).not.toBeNull(); // jerarquía de creación
    expect(rows[0].password_hash).toMatch(/^\$argon2id\$/);
  });

  test('el listado muestra al administrador con el nombre de su institución', async () => {
    const listado = await superadmin.get('/api/admin/administradores');
    expect(listado.status).toBe(200);
    const admin = listado.body.administradores.find((a) => a.correo === CORREO_ADMIN);
    expect(admin).toMatchObject({ rol: 'ADMIN_INSTITUCION', activo: true });
    expect(admin.institucion).toBe(`Liceo Editado ${SUFIJO}`);
  });

  test('rechaza una institución inexistente (400)', async () => {
    const res = await superadmin.post('/api/admin/administradores').send({
      nombre: 'Admin sin sede',
      correo: `fase2.sinsede.${SUFIJO}@m1paes.test`,
      password: CLAVE,
      id_institucion: 99999999,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.details.campos).toEqual(
      expect.arrayContaining([expect.stringContaining('no existe')])
    );
  });

  test('el administrador de sede NO accede al panel Superadmin (403)', async () => {
    const login = await adminSede.post('/api/auth/login').send({ correo: CORREO_ADMIN, password: CLAVE });
    expect(login.status).toBe(200);
    const res = await adminSede.get('/api/admin/instituciones');
    expect(res.status).toBe(403);
  });

  test('baja lógica: DELETE marca al administrador como inactivo', async () => {
    const { rows } = await query('SELECT id_usuario FROM USUARIO WHERE correo = $1', [CORREO_ADMIN]);
    const borrar = await superadmin.delete(`/api/admin/administradores/${rows[0].id_usuario}`);
    expect(borrar.status).toBe(200);
    expect(borrar.body.administrador.activo).toBe(false);
  });
});

describe('RF-08 — Estructuración y publicación de lecciones (CP-11)', () => {
  test('publica una lección en un eje y queda disponible para el estudiante', async () => {
    const crear = await superadmin.post('/api/admin/lecciones').send({
      id_eje: ejeId,
      titulo: `Lección Fase 2 ${SUFIJO}`,
      cuerpo_teoria: 'Teoría de prueba de la fase 2 para verificar la publicación de lecciones.',
      orden: 5,
    });
    expect(crear.status).toBe(201);
    expect(crear.body.leccion.id_eje).toBe(ejeId);
    idLeccion = crear.body.leccion.id_contenido;

    // Visibilidad desde la sesión del estudiante (CP-11).
    const vista = await estudiante.get('/api/ejes');
    expect(vista.status).toBe(200);
    const eje = vista.body.ejes.find((e) => e.id_eje === ejeId);
    expect(eje.lecciones.some((l) => l.id === idLeccion && l.titulo === `Lección Fase 2 ${SUFIJO}`)).toBe(
      true
    );
  });

  test('el listado administrativo muestra la lección con eje y autor', async () => {
    const listado = await superadmin.get(`/api/admin/lecciones?id_eje=${ejeId}`);
    expect(listado.status).toBe(200);
    const leccion = listado.body.lecciones.find((l) => l.id_contenido === idLeccion);
    expect(leccion).toMatchObject({ eje: expect.any(String), admin_creador: 'Superadmin Fase 2' });
  });

  test('rechaza crear una lección en un eje inexistente (400)', async () => {
    const res = await superadmin.post('/api/admin/lecciones').send({
      id_eje: 99999999,
      titulo: 'Lección inválida',
      cuerpo_teoria: 'Este cuerpo no debería poder guardarse nunca.',
    });
    expect(res.status).toBe(400);
  });
});

describe('RF-09 — Banco de ejercicios con solución (CP-12)', () => {
  test('crea un ejercicio con 5 alternativas y exactamente una correcta', async () => {
    const res = await crearEjercicio([
      { texto: 'Opción 1', es_correcta: false },
      { texto: 'Opción 2', es_correcta: true },
      { texto: 'Opción 3', es_correcta: false },
      { texto: 'Opción 4', es_correcta: false },
      { texto: 'Opción 5', es_correcta: false },
    ]);
    expect(res.status).toBe(201);
    expect(res.body.ejercicio.alternativas).toHaveLength(5);
    const correctas = res.body.ejercicio.alternativas.filter((a) => a.es_correcta);
    expect(correctas).toHaveLength(1);
    expect(correctas[0].texto).toBe('Opción 2');
    idEjercicio = res.body.ejercicio.id_ejercicio;

    // Verificación en BD (guardado transaccional).
    const { rows } = await query(
      'SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE es_correcta)::int AS correctas FROM ALTERNATIVA WHERE id_ejercicio = $1',
      [idEjercicio]
    );
    expect(rows[0]).toEqual({ total: 5, correctas: 1 });
  });

  test('rechaza dos alternativas correctas (regla: exactamente una)', async () => {
    const res = await crearEjercicio([
      { texto: 'A', es_correcta: true },
      { texto: 'B', es_correcta: true },
      { texto: 'C', es_correcta: false },
      { texto: 'D', es_correcta: false },
    ]);
    expect(res.status).toBe(400);
    expect(res.body.error.details.campos).toEqual(
      expect.arrayContaining([expect.stringContaining('exactamente una')])
    );
  });

  test('rechaza menos de 4 alternativas', async () => {
    const res = await crearEjercicio([
      { texto: 'A', es_correcta: true },
      { texto: 'B', es_correcta: false },
      { texto: 'C', es_correcta: false },
    ]);
    expect(res.status).toBe(400);
    expect(res.body.error.details.campos).toEqual(
      expect.arrayContaining([expect.stringContaining('entre 4 y 5')])
    );
  });
});

describe('RF-10 — Parametrización de simulacros (CP-13)', () => {
  test('crea un simulacro con el formato oficial: 65 preguntas y 140 minutos', async () => {
    const res = await superadmin.post('/api/admin/simulacros').send({
      nombre: `Simulacro Fase 2 ${SUFIJO}`,
    });
    expect(res.status).toBe(201);
    expect(res.body.simulacro.cantidad_preguntas).toBe(65);
    expect(res.body.simulacro.tiempo_limite_minutos).toBe(140);
    idSimulacro = res.body.simulacro.id_simulacro;

    const listado = await superadmin.get('/api/admin/simulacros');
    const encontrado = listado.body.simulacros.find((s) => s.id_simulacro === idSimulacro);
    expect(encontrado).toMatchObject({ cantidad_preguntas: 65, tiempo_limite_minutos: 140, preguntas: 0 });
  });

  test('reparametriza cantidad y tiempo, y el cambio persiste', async () => {
    const editar = await superadmin
      .put(`/api/admin/simulacros/${idSimulacro}`)
      .send({ cantidad_preguntas: 40, tiempo_limite_minutos: 90 });
    expect(editar.status).toBe(200);

    const listado = await superadmin.get('/api/admin/simulacros');
    const encontrado = listado.body.simulacros.find((s) => s.id_simulacro === idSimulacro);
    expect(encontrado.cantidad_preguntas).toBe(40);
    expect(encontrado.tiempo_limite_minutos).toBe(90);

    // Volver al formato oficial del informe (65/140).
    await superadmin
      .put(`/api/admin/simulacros/${idSimulacro}`)
      .send({ cantidad_preguntas: 65, tiempo_limite_minutos: 140 });
  });

  test('valida parámetros fuera de rango (400)', async () => {
    const res = await superadmin.post('/api/admin/simulacros').send({
      nombre: 'Simulacro inválido',
      cantidad_preguntas: 0,
      tiempo_limite_minutos: 500,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.details.campos).toHaveLength(2);
  });

  test('compone preguntas numeradas 1..n y valida los límites', async () => {
    // El ejercicio creado en el CP-12 pasa a ser la pregunta 1.
    const componer = await superadmin
      .put(`/api/admin/simulacros/${idSimulacro}/preguntas`)
      .send({ id_ejercicios: [idEjercicio] });
    expect(componer.status).toBe(200);
    expect(componer.body.preguntas).toEqual([{ numero_pregunta: 1, id_ejercicio: idEjercicio }]);

    // Un ejercicio inexistente responde 400 (no 500 por la foránea).
    const inexistente = await superadmin
      .put(`/api/admin/simulacros/${idSimulacro}/preguntas`)
      .send({ id_ejercicios: [idEjercicio, 99999999] });
    expect(inexistente.status).toBe(400);

    // Duplicados también responden 400.
    const duplicado = await superadmin
      .put(`/api/admin/simulacros/${idSimulacro}/preguntas`)
      .send({ id_ejercicios: [idEjercicio, idEjercicio] });
    expect(duplicado.status).toBe(400);

    // La composición anterior sigue intacta tras los rechazos.
    const preguntas = await superadmin.get(`/api/admin/simulacros/${idSimulacro}/preguntas`);
    expect(preguntas.body.preguntas).toHaveLength(1);
  });
});
