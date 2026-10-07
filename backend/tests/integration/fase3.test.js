'use strict';

/**
 * Pruebas de integración de la Fase 3: RF-18 (explorar contenidos),
 * RF-11 (retroalimentación inmediata), RF-12 (simulacro cronometrado con
 * puntaje 100–1000) y RF-13 (panel de progreso por eje).
 * Cubren CP-14, CP-15, CP-16, CP-17 y CP-18. Se ejecutan con
 * `npm run test:db` (requieren PostgreSQL con el esquema).
 */
const request = require('supertest');
const { createApp } = require('../../src/app');
const { query, close } = require('../../src/db/pool');
const usuarioRepository = require('../../src/repositories/usuario.repository');
const { hashPassword } = require('../../src/services/password.service');

const app = createApp();

const SUFIJO = Date.now().toString();
const CORREO_SUPER = `fase3.super.${SUFIJO}@m1paes.test`;
const CORREO_ESTUDIANTE = `fase3.est.${SUFIJO}@m1paes.test`;
const CLAVE = 'clave_fase3_12345';

const superadmin = request.agent(app);
const estudiante = request.agent(app);

let idLeccion;
let ejercicios; // [{ id_ejercicio, correcta: id_alternativa }]
let idSimulacro;

async function crearEjercicio(opcionCorrecta) {
  const res = await superadmin.post('/api/admin/ejercicios').send({
    id_contenido: idLeccion,
    enunciado: `Ejercicio de práctica de la fase 3 ${SUFIJO}`,
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
    nombre: 'Superadmin Fase 3',
    correo: CORREO_SUPER,
    passwordHash: await hashPassword(CLAVE),
  });
  await usuarioRepository.crear({
    idRol: await usuarioRepository.idPorNombreRol('ESTUDIANTE'),
    nombre: 'Estudiante Fase 3',
    correo: CORREO_ESTUDIANTE,
    passwordHash: await hashPassword(CLAVE),
  });

  expect(
    (await superadmin.post('/api/auth/login').send({ correo: CORREO_SUPER, password: CLAVE })).status
  ).toBe(200);
  expect(
    (await estudiante.post('/api/auth/login').send({ correo: CORREO_ESTUDIANTE, password: CLAVE }))
      .status
  ).toBe(200);

  // Semilla: una lección con 2 ejercicios y un simulacro 65/140 compuesto
  // con ellos (la composición es de la Fase 2; acá solo se consume).
  const { rows: eje } = await query('SELECT id_eje FROM EJE_TEMATICO ORDER BY id_eje LIMIT 1');
  const leccion = await superadmin.post('/api/admin/lecciones').send({
    id_eje: eje[0].id_eje,
    titulo: `Lección Fase 3 ${SUFIJO}`,
    cuerpo_teoria:
      'Teoría de la fase 3 para verificar la lectura completa de una lección por el estudiante.',
    orden: 7,
  });
  expect(leccion.status).toBe(201);
  idLeccion = leccion.body.leccion.id_contenido;

  ejercicios = [
    await crearEjercicio('9'),
    await crearEjercicio('6'),
  ];

  const simulacro = await superadmin.post('/api/admin/simulacros').send({
    nombre: `Simulacro Fase 3 ${SUFIJO}`,
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
  // (→ ejercicios/alternativas/progreso) y usuarios (→ historial/respuestas).
  await query('DELETE FROM SIMULACRO WHERE nombre = $1', [`Simulacro Fase 3 ${SUFIJO}`]);
  await query('DELETE FROM CONTENIDO WHERE titulo = $1', [`Lección Fase 3 ${SUFIJO}`]);
  await query('DELETE FROM USUARIO WHERE correo LIKE $1', [`%.${SUFIJO}@m1paes.test`]);
  await close();
});

describe('RF-18 — Explorar ejes y lecciones publicadas (CP-14)', () => {
  test('el estudiante ve los 4 ejes oficiales con la lección publicada', async () => {
    const res = await estudiante.get('/api/ejes');
    expect(res.status).toBe(200);
    expect(res.body.ejes).toHaveLength(4);

    const eje = res.body.ejes[0];
    expect(eje.lecciones.some((l) => l.id === idLeccion && l.titulo === `Lección Fase 3 ${SUFIJO}`)).toBe(
      true
    );
  });

  test('la lección entrega la teoría completa y sus ejercicios sin solución', async () => {
    const res = await estudiante.get(`/api/contenido/lecciones/${idLeccion}`);
    expect(res.status).toBe(200);
    expect(res.body.leccion.cuerpo_teoria).toContain('Teoría de la fase 3');
    expect(res.body.ejercicios).toHaveLength(2);
    // El listado de práctica nunca revela cuál es la correcta ni la explicación.
    expect(JSON.stringify(res.body.ejercicios)).not.toMatch(/es_correcta|explicacion_solucion/);
  });

  test('el detalle de lección no está disponible fuera del rol Estudiante (403)', async () => {
    const res = await superadmin.get(`/api/contenido/lecciones/${idLeccion}`);
    expect(res.status).toBe(403);
  });
});

describe('RF-11 — Retroalimentación inmediata (CP-15 y CP-16)', () => {
  test('CP-15: la práctica entrega el ejercicio sin la correcta ni la solución', async () => {
    const res = await estudiante.get(`/api/practica/ejercicios/${ejercicios[0].id_ejercicio}`);
    expect(res.status).toBe(200);
    expect(res.body.ejercicio.alternativas).toHaveLength(4);
    expect(JSON.stringify(res.body)).not.toMatch(/es_correcta|explicacion_solucion/);
  });

  test('CP-15: responder correctamente produce la retroalimentación de éxito', async () => {
    const res = await estudiante
      .post(`/api/practica/ejercicios/${ejercicios[0].id_ejercicio}/respuesta`)
      .send({ id_alternativa: ejercicios[0].correcta });
    expect(res.status).toBe(200);
    expect(res.body.esCorrecta).toBe(true);
    expect(res.body.mensaje).toMatch(/correcto/i);
    // 1 de 2 ejercicios del contenido con acierto → 50 % de progreso.
    expect(res.body.progreso).toMatchObject({ porcentaje: 50, completado: false });

    const { rows } = await query(
      'SELECT es_correcta FROM RESPUESTA_USUARIO WHERE id_ejercicio = $1 AND id_estudiante = (SELECT id_usuario FROM USUARIO WHERE correo = $2)',
      [ejercicios[0].id_ejercicio, CORREO_ESTUDIANTE]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].es_correcta).toBe(true);
  });

  test('CP-16: responder incorrectamente entrega la solución paso a paso', async () => {
    // Elegimos una alternativa equivocada del segundo ejercicio.
    const { rows } = await query(
      'SELECT id_alternativa FROM ALTERNATIVA WHERE id_ejercicio = $1 AND NOT es_correcta ORDER BY id_alternativa LIMIT 1',
      [ejercicios[1].id_ejercicio]
    );
    const equivocada = rows[0].id_alternativa;

    const res = await estudiante
      .post(`/api/practica/ejercicios/${ejercicios[1].id_ejercicio}/respuesta`)
      .send({ id_alternativa: equivocada });
    expect(res.status).toBe(200);
    expect(res.body.esCorrecta).toBe(false);
    expect(res.body.mensaje).toMatch(/incorrecta/i);
    expect(res.body.explicacion).toContain('Paso 1');
    expect(res.body.alternativaCorrecta.id).toBe(ejercicios[1].correcta);
    // El fallo no suma progreso: sigue en 50 %.
    expect(res.body.progreso.porcentaje).toBe(50);
  });

  test('una alternativa ajena al ejercicio se rechaza (400)', async () => {
    const res = await estudiante
      .post(`/api/practica/ejercicios/${ejercicios[0].id_ejercicio}/respuesta`)
      .send({ id_alternativa: 99999999 });
    expect(res.status).toBe(400);
    expect(res.body.error.details.campos).toEqual(
      expect.arrayContaining([expect.stringContaining('no pertenece')])
    );
  });

  test('la práctica no está disponible fuera del rol Estudiante (403)', async () => {
    const res = await superadmin.get(`/api/practica/ejercicios/${ejercicios[0].id_ejercicio}`);
    expect(res.status).toBe(403);
  });
});

describe('RF-12 — Simulacro cronometrado 65 preguntas / 140 minutos (CP-17)', () => {
  let idIntento;

  test('inicia el intento y las preguntas vienen sin solución', async () => {
    const res = await estudiante.post(`/api/simulacros/${idSimulacro}/intentar`);
    expect(res.status).toBe(201);
    expect(res.body.simulacro).toMatchObject({ tiempoLimiteMinutos: 140, totalPreguntas: 2 });
    expect(res.body.preguntas).toHaveLength(2);
    expect(JSON.stringify(res.body.preguntas)).not.toMatch(/es_correcta|explicacion_solucion/);
    idIntento = res.body.intento.id;
  });

  test('registra cada respuesta sin revelar si fue correcta', async () => {
    const acierto = await estudiante
      .put(`/api/simulacros/intentos/${idIntento}/respuestas`)
      .send({ id_ejercicio: ejercicios[0].id_ejercicio, id_alternativa: ejercicios[0].correcta });
    expect(acierto.status).toBe(200);
    expect(acierto.body).not.toHaveProperty('esCorrecta');

    const { rows } = await query(
      'SELECT id_alternativa FROM ALTERNATIVA WHERE id_ejercicio = $1 AND NOT es_correcta ORDER BY id_alternativa LIMIT 1',
      [ejercicios[1].id_ejercicio]
    );
    const fallo = await estudiante
      .put(`/api/simulacros/intentos/${idIntento}/respuestas`)
      .send({ id_ejercicio: ejercicios[1].id_ejercicio, id_alternativa: rows[0].id_alternativa });
    expect(fallo.status).toBe(200);
  });

  test('al finalizar entrega puntaje 100–1000, el tiempo y la revisión', async () => {
    const res = await estudiante
      .post(`/api/simulacros/intentos/${idIntento}/finalizar`)
      .send({ duracion_minutos: 42 });
    expect(res.status).toBe(200);
    // 1 acierto de 2 → 100 + 450 = 550 (dentro de la escala 100–1000).
    expect(res.body.resultado).toMatchObject({
      puntaje: 550,
      correctas: 1,
      total: 2,
      respondidas: 2,
      duracionMinutos: 42,
    });
    expect(res.body.detalle).toHaveLength(2);
    expect(res.body.detalle.filter((d) => d.esCorrecta === true)).toHaveLength(1);
    expect(res.body.detalle.filter((d) => d.esCorrecta === false)).toHaveLength(1);

    const { rows } = await query(
      'SELECT puntaje_obtenido::float AS puntaje, duracion_minutos FROM HISTORIAL_AVANCE WHERE id_historial = $1',
      [idIntento]
    );
    expect(rows[0]).toEqual({ puntaje: 550, duracion_minutos: 42 });
  });

  test('el intento cerrado rechaza más respuestas y un nuevo cierre (409)', async () => {
    const respuesta = await estudiante
      .put(`/api/simulacros/intentos/${idIntento}/respuestas`)
      .send({ id_ejercicio: ejercicios[0].id_ejercicio, id_alternativa: ejercicios[0].correcta });
    expect(respuesta.status).toBe(409);

    const cierre = await estudiante
      .post(`/api/simulacros/intentos/${idIntento}/finalizar`)
      .send({ duracion_minutos: 10 });
    expect(cierre.status).toBe(409);
  });

  test('rechaza cerrar con una duración sobre el límite de 140 minutos (400)', async () => {
    const nuevo = await estudiante.post(`/api/simulacros/${idSimulacro}/intentar`);
    expect(nuevo.status).toBe(201);
    const res = await estudiante
      .post(`/api/simulacros/intentos/${nuevo.body.intento.id}/finalizar`)
      .send({ duracion_minutos: 999 });
    expect(res.status).toBe(400);
    expect(res.body.error.details.campos).toEqual(
      expect.arrayContaining([expect.stringContaining('140')])
    );
  });

  test('una respuesta de ejercicio fuera de la composición se rechaza (400)', async () => {
    const nuevo = await estudiante.post(`/api/simulacros/${idSimulacro}/intentar`);
    const res = await estudiante
      .put(`/api/simulacros/intentos/${nuevo.body.intento.id}/respuestas`)
      .send({ id_ejercicio: 99999999, id_alternativa: 1 });
    expect(res.status).toBe(400);
  });
});

describe('RF-13 — Panel de progreso por eje (CP-18)', () => {
  test('muestra el porcentaje por eje actualizado con las prácticas', async () => {
    const res = await estudiante.get('/api/progreso');
    expect(res.status).toBe(200);
    expect(res.body.ejes).toHaveLength(4);

    const ejePractica = res.body.ejes[0];
    const { rows: esperado } = await query(
      `SELECT COALESCE(ROUND(AVG(COALESCE(p.porcentaje, 0))::numeric, 1), 0)::float AS porcentaje
       FROM EJE_TEMATICO e LEFT JOIN CONTENIDO c ON c.id_eje = e.id_eje
       LEFT JOIN PROGRESO p ON p.id_contenido = c.id_contenido AND p.id_estudiante = $1
       WHERE e.id_eje = $2 GROUP BY e.id_eje`,
      [(await usuarioRepository.porCorreo(CORREO_ESTUDIANTE)).id_usuario, ejePractica.id_eje]
    );
    expect(ejePractica.porcentaje).toBe(esperado[0].porcentaje);
    expect(ejePractica.porcentaje).toBeGreaterThan(0);
    expect(res.body.ejes.slice(1).every((e) => e.porcentaje === 0)).toBe(true);
    expect(res.body.global).toBe(
      Math.round((res.body.ejes.reduce((suma, eje) => suma + eje.porcentaje, 0) / 4) * 10) / 10
    );
  });

  test('el resumen refleja prácticas y el simulacro finalizado', async () => {
    const res = await estudiante.get('/api/progreso');
    expect(res.body.resumen).toMatchObject({
      practicas: 2,
      simulacros: 1, // solo cuenta intentos finalizados
      mejor_puntaje: 550,
      promedio_puntaje: 550,
    });

    const tipos = res.body.historial.map((h) => h.tipo_actividad);
    expect(tipos).toEqual(expect.arrayContaining(['PRACTICA_LECCION', 'SIMULACRO_OFICIAL']));
    const simulacro = res.body.historial.find((h) => h.tipo_actividad === 'SIMULACRO_OFICIAL' && h.puntaje_obtenido > 0);
    expect(simulacro).toMatchObject({ puntaje_obtenido: 550, duracion_minutos: 42 });
    expect(simulacro.simulacro).toBe(`Simulacro Fase 3 ${SUFIJO}`);
  });

  test('el panel no está disponible fuera del rol Estudiante (403)', async () => {
    const res = await superadmin.get('/api/progreso');
    expect(res.status).toBe(403);
  });
});
