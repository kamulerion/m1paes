'use strict';

/**
 * Pruebas de integración de la Fase 4 (módulo institucional):
 * - RF-07: matrícula, edición y baja de estudiantes de la sede (CP-09).
 * - RF-16: calendario de ensayos aislado por sede (CP-10).
 * - RF-14: reporte consolidado con promedio y áreas débiles (CP-19).
 * - RF-17: métricas globales de concurrencia y actividad (CP-20).
 * Se ejecutan con `npm run test:db` (requieren PostgreSQL con el esquema).
 */
const request = require('supertest');
const { createApp } = require('../../src/app');
const { query, close } = require('../../src/db/pool');
const usuarioRepository = require('../../src/repositories/usuario.repository');
const { hashPassword } = require('../../src/services/password.service');

const app = createApp();

const SUFIJO = Date.now().toString();
// Correos en minúsculas: la API normaliza antes de persistir y comparar.
const CORREO_SUPER = `fase4.super.${SUFIJO}@m1paes.test`;
const CORREO_ADMIN_A = `fase4.admina.${SUFIJO}@m1paes.test`;
const CORREO_ADMIN_B = `fase4.adminb.${SUFIJO}@m1paes.test`;
const CORREO_EST_A = `fase4.esta.${SUFIJO}@m1paes.test`;
const CORREO_EST_B = `fase4.estb.${SUFIJO}@m1paes.test`;
const CORREO_EST_BAJA = `fase4.estbaja.${SUFIJO}@m1paes.test`;
const CORREO_EST_FREE = `fase4.estfree.${SUFIJO}@m1paes.test`;
const CLAVE = 'clave_fase4_12345';
const RUT_A = `norte-${SUFIJO}`;
const RUT_B = `sur-${SUFIJO}`;

const superadmin = request.agent(app);
const adminA = request.agent(app);
const adminB = request.agent(app);
const estudianteA = request.agent(app);
const estudianteB = request.agent(app);
const estudianteFree = request.agent(app);

let idInstitucionA;
let idInstitucionB;
let idAdminA;
let idEstudianteA;
let idEvento;
let idLeccion;
let ejeId; // eje de la lección (primer eje temático)
let ejercicios; // [{ id_ejercicio, correcta }]
let idSimulacro;

async function crearEjercicio(opcionCorrecta) {
  const res = await superadmin.post('/api/admin/ejercicios').send({
    id_contenido: idLeccion,
    enunciado: `Ejercicio de la fase 4 ${SUFIJO}`,
    explicacion_solucion: 'Paso 1: identificar los datos. Paso 2: aplicar la operación indicada.',
    dificultad: 'MEDIA',
    alternativas: ['6', '9', '12', '18'].map((texto) => ({
      texto,
      es_correcta: texto === opcionCorrecta,
    })),
  });
  expect(res.status).toBe(201);
  const correcta = res.body.ejercicio.alternativas.find((a) => a.es_correcta);
  return { id_ejercicio: res.body.ejercicio.id_ejercicio, correcta: correcta.id_alternativa };
}

beforeAll(async () => {
  await usuarioRepository.crear({
    idRol: await usuarioRepository.idPorNombreRol('SUPERADMIN'),
    nombre: 'Superadmin Fase 4',
    correo: CORREO_SUPER,
    passwordHash: await hashPassword(CLAVE),
  });
  expect(
    (await superadmin.post('/api/auth/login').send({ correo: CORREO_SUPER, password: CLAVE })).status
  ).toBe(200);

  // Dos sedes con su administrador (RF-06, ya probado en Fase 2).
  const sedeA = await superadmin.post('/api/admin/instituciones').send({
    nombre: `Sede Norte ${SUFIJO}`,
    rut_identificador: RUT_A,
    convenio_tipo: 'B2B_PREMIUM',
  });
  expect(sedeA.status).toBe(201);
  idInstitucionA = sedeA.body.institucion.id_institucion;

  const sedeB = await superadmin.post('/api/admin/instituciones').send({
    nombre: `Sede Sur ${SUFIJO}`,
    rut_identificador: RUT_B,
  });
  expect(sedeB.status).toBe(201);
  idInstitucionB = sedeB.body.institucion.id_institucion;

  for (const [correo, id_institucion, nombre] of [
    [CORREO_ADMIN_A, idInstitucionA, 'Admin Norte Fase 4'],
    [CORREO_ADMIN_B, idInstitucionB, 'Admin Sur Fase 4'],
  ]) {
    const admin = await superadmin.post('/api/admin/administradores').send({
      nombre,
      correo,
      password: CLAVE,
      id_institucion,
      cargo: 'Jefe de UTP',
    });
    expect(admin.status).toBe(201);
    if (correo === CORREO_ADMIN_A) idAdminA = admin.body.administrador.id;
    const agente = correo === CORREO_ADMIN_A ? adminA : adminB;
    expect((await agente.post('/api/auth/login').send({ correo, password: CLAVE })).status).toBe(200);
  }

  // Contenido semilla (Fase 2, ya probada): una lección con 2 ejercicios y
  // un simulacro 65/140 compuesto con ellos, para dar actividad a la sede A.
  const { rows: eje } = await query('SELECT id_eje FROM EJE_TEMATICO ORDER BY id_eje LIMIT 1');
  ejeId = eje[0].id_eje;
  const leccion = await superadmin.post('/api/admin/lecciones').send({
    id_eje: ejeId,
    titulo: `Lección Fase 4 ${SUFIJO}`,
    cuerpo_teoria:
      'Teoría de la fase 4 para verificar que el reporte institucional considere el progreso.',
    orden: 9,
  });
  expect(leccion.status).toBe(201);
  idLeccion = leccion.body.leccion.id_contenido;

  ejercicios = [await crearEjercicio('9'), await crearEjercicio('6')];

  const simulacro = await superadmin.post('/api/admin/simulacros').send({
    nombre: `Simulacro Fase 4 ${SUFIJO}`,
    cantidad_preguntas: 65,
    tiempo_limite_minutos: 140,
  });
  expect(simulacro.status).toBe(201);
  idSimulacro = simulacro.body.simulacro.id_simulacro;
  const compuesto = await superadmin
    .put(`/api/admin/simulacros/${idSimulacro}/preguntas`)
    .send({ id_ejercicios: ejercicios.map((e) => e.id_ejercicio) });
  expect(compuesto.status).toBe(200);
});

afterAll(async () => {
  // Orden por restricciones FK: simulacros (→ composición), contenido
  // (→ ejercicios/alternativas/progreso), usuarios (→ historial/respuestas,
  // calendario) y finalmente las instituciones.
  await query('DELETE FROM SIMULACRO WHERE nombre = $1', [`Simulacro Fase 4 ${SUFIJO}`]);
  await query('DELETE FROM CONTENIDO WHERE titulo = $1', [`Lección Fase 4 ${SUFIJO}`]);
  await query('DELETE FROM USUARIO WHERE correo LIKE $1', [`%.${SUFIJO}@m1paes.test`]);
  await query('DELETE FROM INSTITUCION WHERE rut_identificador IN ($1, $2)', [RUT_A, RUT_B]);
  await close();
});

describe('RF-07 — Matrícula y baja de estudiantes de la sede (CP-09)', () => {
  test('matricula un estudiante vinculado a la sede con trazabilidad e institución', async () => {
    const res = await adminA.post('/api/institucion/estudiantes').send({
      nombre: 'Estudiante Norte Fase 4',
      correo: CORREO_EST_A,
      password: CLAVE,
      matricula: 'MAT-001',
    });
    expect(res.status).toBe(201);
    expect(res.body.estudiante).toMatchObject({
      nombre: 'Estudiante Norte Fase 4',
      correo: CORREO_EST_A,
      rol: 'ESTUDIANTE',
      suscripcion: 'INSTITUCIONAL',
      idInstitucion: idInstitucionA,
      matricula: 'MAT-001',
      activo: true,
    });
    idEstudianteA = res.body.estudiante.id;

    // CP-09: verificación directa del vínculo y la trazabilidad en la BD.
    const { rows } = await query(
      'SELECT id_institucion, id_usuario_creador, tipo_suscripcion FROM USUARIO WHERE correo = $1',
      [CORREO_EST_A]
    );
    expect(rows[0]).toEqual({
      id_institucion: idInstitucionA,
      id_usuario_creador: idAdminA,
      tipo_suscripcion: 'INSTITUCIONAL',
    });

    // El estudiante matriculado puede iniciar sesión con la clave asignada.
    expect(
      (await estudianteA.post('/api/auth/login').send({ correo: CORREO_EST_A, password: CLAVE }))
        .status
    ).toBe(200);
  });

  test('el estudiante matriculado queda listado en su sede', async () => {
    const res = await adminA.get('/api/institucion/estudiantes');
    expect(res.status).toBe(200);
    const listado = res.body.estudiantes.find((e) => e.correo === CORREO_EST_A);
    expect(listado).toMatchObject({ matricula: 'MAT-001', activo: true, institucion: `Sede Norte ${SUFIJO}` });
  });

  test('edita nombre y matrícula del estudiante', async () => {
    const res = await adminA.put(`/api/institucion/estudiantes/${idEstudianteA}`).send({
      nombre: 'Estudiante Norte Editado',
      matricula: 'MAT-777',
    });
    expect(res.status).toBe(200);
    expect(res.body.estudiante).toMatchObject({ nombre: 'Estudiante Norte Editado', matricula: 'MAT-777' });
  });

  test('rechaza un correo ya registrado (409) y datos inválidos (400)', async () => {
    const duplicado = await adminA.post('/api/institucion/estudiantes').send({
      nombre: 'Otro Estudiante',
      correo: CORREO_EST_A,
      password: CLAVE,
    });
    expect(duplicado.status).toBe(409);

    const invalido = await adminA.post('/api/institucion/estudiantes').send({
      nombre: 'Sin Clave',
      correo: `sinclave.${SUFIJO}@m1paes.test`,
      password: '123',
    });
    expect(invalido.status).toBe(400);
  });

  test('da de baja a un estudiante sin perder el registro (lógico)', async () => {
    const creado = await adminA.post('/api/institucion/estudiantes').send({
      nombre: 'Estudiante Baja Fase 4',
      correo: CORREO_EST_BAJA,
      password: CLAVE,
    });
    expect(creado.status).toBe(201);
    const id = creado.body.estudiante.id;

    const baja = await adminA.delete(`/api/institucion/estudiantes/${id}`);
    expect(baja.status).toBe(200);
    expect(baja.body.estudiante.activo).toBe(false);

    // Sigue listado (baja lógica), marcado como inactivo.
    const listado = await adminA.get('/api/institucion/estudiantes');
    const fila = listado.body.estudiantes.find((e) => e.correo === CORREO_EST_BAJA);
    expect(fila).toMatchObject({ activo: false });
  });

  test('una sede no ve ni toca estudiantes de otra sede (404)', async () => {
    const listado = await adminB.get('/api/institucion/estudiantes');
    expect(listado.status).toBe(200);
    expect(listado.body.estudiantes.some((e) => e.correo === CORREO_EST_A)).toBe(false);

    const edicion = await adminB
      .put(`/api/institucion/estudiantes/${idEstudianteA}`)
      .send({ nombre: 'Intento Ajeno' });
    expect(edicion.status).toBe(404);

    const baja = await adminB.delete(`/api/institucion/estudiantes/${idEstudianteA}`);
    expect(baja.status).toBe(404);
  });

  test('otras sesiones no acceden al módulo institucional (403)', async () => {
    expect((await estudianteA.get('/api/institucion/estudiantes')).status).toBe(403);
    expect((await superadmin.get('/api/institucion/estudiantes')).status).toBe(403);
    expect((await estudianteA.get('/api/institucion/reporte')).status).toBe(403);
  });
});

describe('RF-16 — Calendario de ensayos de la sede (CP-10)', () => {
  test('asigna un evento y solo aparece en el calendario de su sede', async () => {
    const res = await adminA.post('/api/institucion/calendario').send({
      titulo: `Ensayo DEMRE ${SUFIJO}`,
      descripcion: 'Ensayo general de matemática de la sede norte.',
      fecha_evento: '2026-10-20T09:00',
    });
    expect(res.status).toBe(201);
    // Reloj de pared: la fecha ida y vuelta no arrastra husos.
    expect(res.body.evento).toMatchObject({
      titulo: `Ensayo DEMRE ${SUFIJO}`,
      fecha_evento: '2026-10-20T09:00',
      id_institucion: idInstitucionA,
    });
    idEvento = res.body.evento.id_evento;

    const deA = await adminA.get('/api/institucion/calendario');
    expect(deA.body.eventos.some((e) => e.id_evento === idEvento)).toBe(true);
    // Regresión del humo Fase 4: el listado debe mantener el reloj de pared
    // (YYYY-MM-DDTHH:MM) y no devolver el timestamp crudo con huso.
    expect(deA.body.eventos.find((e) => e.id_evento === idEvento).fecha_evento).toBe('2026-10-20T09:00');

    // CP-10: el evento NO se publica en la otra sede.
    const deB = await adminB.get('/api/institucion/calendario');
    expect(deB.status).toBe(200);
    expect(deB.body.eventos.some((e) => e.id_evento === idEvento)).toBe(false);
  });

  test('el evento se publica a los estudiantes de esa sede y no a los de otra', async () => {
    const creadoB = await adminB.post('/api/institucion/estudiantes').send({
      nombre: 'Estudiante Sur Fase 4',
      correo: CORREO_EST_B,
      password: CLAVE,
    });
    expect(creadoB.status).toBe(201);
    expect(
      (await estudianteB.post('/api/auth/login').send({ correo: CORREO_EST_B, password: CLAVE })).status
    ).toBe(200);

    const verA = await estudianteA.get('/api/calendario');
    expect(verA.status).toBe(200);
    expect(verA.body.eventos.some((e) => e.id_evento === idEvento)).toBe(true);

    const verB = await estudianteB.get('/api/calendario');
    expect(verB.status).toBe(200);
    expect(verB.body.eventos).toHaveLength(0);
  });

  test('el Estudiante Free (sin sede) ve la lista vacía', async () => {
    await usuarioRepository.crear({
      idRol: await usuarioRepository.idPorNombreRol('ESTUDIANTE'),
      nombre: 'Estudiante Free Fase 4',
      correo: CORREO_EST_FREE,
      passwordHash: await hashPassword(CLAVE),
    });
    expect(
      (await estudianteFree.post('/api/auth/login').send({ correo: CORREO_EST_FREE, password: CLAVE }))
        .status
    ).toBe(200);

    const res = await estudianteFree.get('/api/calendario');
    expect(res.status).toBe(200);
    expect(res.body.eventos).toEqual([]);
  });

  test('no se puede editar ni eliminar un evento de otra sede (404)', async () => {
    const edicion = await adminB
      .put(`/api/institucion/calendario/${idEvento}`)
      .send({ titulo: 'Intento Ajeno' });
    expect(edicion.status).toBe(404);

    const borrado = await adminB.delete(`/api/institucion/calendario/${idEvento}`);
    expect(borrado.status).toBe(404);

    // El evento sigue intacto en la sede A.
    const deA = await adminA.get('/api/institucion/calendario');
    expect(deA.body.eventos.find((e) => e.id_evento === idEvento).titulo).toBe(`Ensayo DEMRE ${SUFIJO}`);
  });

  test('edita y elimina eventos de la propia sede; valida datos (400)', async () => {
    const edicion = await adminA.put(`/api/institucion/calendario/${idEvento}`).send({
      titulo: `Ensayo DEMRE reprogramado ${SUFIJO}`,
      fecha_evento: '2026-10-27T10:30',
    });
    expect(edicion.status).toBe(200);
    expect(edicion.body.evento).toMatchObject({
      titulo: `Ensayo DEMRE reprogramado ${SUFIJO}`,
      fecha_evento: '2026-10-27T10:30',
    });

    const sinFecha = await adminA.post('/api/institucion/calendario').send({
      titulo: 'Sin fecha',
    });
    expect(sinFecha.status).toBe(400);
    expect(sinFecha.body.error.details.campos).toEqual(
      expect.arrayContaining([expect.stringContaining('fecha')])
    );

    const borrado = await adminA.delete(`/api/institucion/calendario/${idEvento}`);
    expect(borrado.status).toBe(200);
    const deA = await adminA.get('/api/institucion/calendario');
    expect(deA.body.eventos.some((e) => e.id_evento === idEvento)).toBe(false);
  });
});

describe('RF-14 — Reporte consolidado de la sede (CP-19)', () => {
  beforeAll(async () => {
    // Actividad real de un estudiante de la sede A: una práctica correcta
    // (50 % de progreso: 1 de 2 ejercicios) y un simulacro finalizado 1/2.
    const practica = await estudianteA
      .post(`/api/practica/ejercicios/${ejercicios[0].id_ejercicio}/respuesta`)
      .send({ id_alternativa: ejercicios[0].correcta });
    expect(practica.status).toBe(200);
    expect(practica.body.esCorrecta).toBe(true);

    const intento = await estudianteA.post(`/api/simulacros/${idSimulacro}/intentar`);
    expect(intento.status).toBe(201);
    const idIntento = intento.body.intento.id;

    await estudianteA
      .put(`/api/simulacros/intentos/${idIntento}/respuestas`)
      .send({ id_ejercicio: ejercicios[0].id_ejercicio, id_alternativa: ejercicios[0].correcta });
    const { rows: incorrecta } = await query(
      'SELECT id_alternativa FROM ALTERNATIVA WHERE id_ejercicio = $1 AND NOT es_correcta ORDER BY id_alternativa LIMIT 1',
      [ejercicios[1].id_ejercicio]
    );
    await estudianteA
      .put(`/api/simulacros/intentos/${idIntento}/respuestas`)
      .send({ id_ejercicio: ejercicios[1].id_ejercicio, id_alternativa: incorrecta[0].id_alternativa });

    const cierre = await estudianteA
      .post(`/api/simulacros/intentos/${idIntento}/finalizar`)
      .send({ duracion_minutos: 42 });
    expect(cierre.status).toBe(200);
    expect(cierre.body.resultado.puntaje).toBe(550);
  });

  test('entrega promedio de puntajes y áreas débiles ordenadas de la sede', async () => {
    const res = await adminA.get('/api/institucion/reporte');
    expect(res.status).toBe(200);
    expect(res.body.sede).toMatchObject({ id: idInstitucionA, nombre: `Sede Norte ${SUFIJO}` });

    // CP-19: promedio de puntajes de la sede.
    expect(res.body.resumen).toMatchObject({
      estudiantes: 2, // matriculado + dado de baja (sigue contando en la sede)
      practicas: 1,
      simulacros: 1,
      promedio_puntaje: 550,
      mejor_puntaje: 550,
    });
    expect(res.body.resumen.activos).toBe(1);

    // CP-19: áreas débiles = ejes con menor progreso promedio primero.
    const areas = res.body.areas_debiles;
    expect(areas).toHaveLength(4);
    for (let i = 1; i < areas.length; i += 1) {
      expect(areas[i].progreso_promedio).toBeGreaterThanOrEqual(areas[i - 1].progreso_promedio);
    }
    const ejeConPractica = areas.find((a) => a.id_eje === ejeId);
    const { rows: esperado } = await query(
      `SELECT COALESCE(ROUND(AVG(COALESCE(p.porcentaje, 0))::numeric, 1), 0)::float AS porcentaje
       FROM EJE_TEMATICO e LEFT JOIN CONTENIDO c ON c.id_eje = e.id_eje
       LEFT JOIN ROL r ON r.nombre_rol = 'ESTUDIANTE'
       LEFT JOIN USUARIO u ON u.id_institucion = $1 AND u.id_rol = r.id_rol
       LEFT JOIN PROGRESO p ON p.id_contenido = c.id_contenido AND p.id_estudiante = u.id_usuario
       WHERE e.id_eje = $2 GROUP BY e.id_eje`,
      [idInstitucionA, ejeId]
    );
    expect(ejeConPractica.progreso_promedio).toBe(esperado[0].porcentaje);
    expect(ejeConPractica.progreso_promedio).toBeGreaterThan(0);
    expect(ejeConPractica).toMatchObject({ respuestas: 3, aciertos: 2 }); // 1 práctica + 2 del simulacro
    expect(areas[0].progreso_promedio).toBe(0); // el resto sin actividad
  });

  test('una sede sin actividad reporta ceros consistentes', async () => {
    const res = await adminB.get('/api/institucion/reporte');
    expect(res.status).toBe(200);
    expect(res.body.resumen).toMatchObject({
      estudiantes: 1,
      practicas: 0,
      simulacros: 0,
      promedio_puntaje: 0,
      mejor_puntaje: 0,
    });
    expect(res.body.areas_debiles.every((a) => a.progreso_promedio === 0)).toBe(true);
  });
});

describe('RF-17 — Métricas globales de concurrencia y actividad (CP-20)', () => {
  test('el Superadmin ve concurrencia y actividad agregadas', async () => {
    const res = await superadmin.get('/api/admin/metricas');
    expect(res.status).toBe(200);

    // CP-20: concurrencia (usuarios/sedes).
    const { concurrencia } = res.body;
    expect(concurrencia.usuarios).toBeGreaterThanOrEqual(6);
    expect(concurrencia.usuarios_activos).toBeGreaterThanOrEqual(5); // 1 baja lógica
    expect(concurrencia.instituciones).toBeGreaterThanOrEqual(2);
    const porRol = Object.fromEntries(concurrencia.porRol.map((f) => [f.rol, f.total]));
    expect(porRol.SUPERADMIN).toBeGreaterThanOrEqual(1);
    expect(porRol.ADMIN_INSTITUCION).toBeGreaterThanOrEqual(2);
    expect(porRol.ESTUDIANTE).toBeGreaterThanOrEqual(4);

    // CP-20: actividad (prácticas, simulacros, respuestas y serie de 7 días).
    const { actividad, serie } = res.body;
    expect(actividad.practicas).toBeGreaterThanOrEqual(1);
    expect(actividad.simulacros).toBeGreaterThanOrEqual(1);
    expect(actividad.puntaje_promedio).toBe(550);
    expect(actividad.respuestas).toBeGreaterThanOrEqual(3);
    expect(serie).toHaveLength(7);
    expect(serie[6].fecha >= serie[0].fecha).toBe(true); // cronológico
    expect(serie[6].practicas).toBeGreaterThanOrEqual(1);
    expect(serie[6].simulacros).toBeGreaterThanOrEqual(1);
  });

  test('las métricas globales no están disponibles para otros roles (403)', async () => {
    expect((await adminA.get('/api/admin/metricas')).status).toBe(403);
    expect((await estudianteA.get('/api/admin/metricas')).status).toBe(403);
  });
});
