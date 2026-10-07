'use strict';

const { query } = require('../db/pool');

/**
 * Repositorio del avance del estudiante (RF-11, RF-12, RF-13).
 * Tablas: HISTORIAL_AVANCE (intentos), RESPUESTA_USUARIO (auditoría por
 * alternativa) y PROGRESO (porcentaje por contenido).
 */

// ---------- HISTORIAL_AVANCE (intentos) ----------

/**
 * Crea un intento. Los simulacros empiezan con puntaje 0 (≠ de terminado,
 * que siempre es ≥ 100) para poder detectar intentos abiertos sin columna
 * nueva en el esquema v3.
 */
async function crearHistorial({ idEstudiante, idSimulacro, tipoActividad }) {
  const { rows } = await query(
    `INSERT INTO HISTORIAL_AVANCE (id_estudiante, id_simulacro, tipo_actividad, puntaje_obtenido, duracion_minutos)
     VALUES ($1, $2, $3, 0.00, 0)
     RETURNING *`,
    [idEstudiante, idSimulacro, tipoActividad]
  );
  return rows[0];
}

/** Intento con su simulacro (para validar pertenencia y tiempo límite). */
async function porId(idHistorial) {
  const { rows } = await query(
    `SELECT h.*, s.nombre AS simulacro, s.tiempo_limite_minutos, s.cantidad_preguntas
     FROM HISTORIAL_AVANCE h
     LEFT JOIN SIMULACRO s ON s.id_simulacro = h.id_simulacro
     WHERE h.id_historial = $1`,
    [idHistorial]
  );
  return rows[0] ?? null;
}

async function finalizarHistorial(idHistorial, { puntaje, duracionMinutos }) {
  const { rows } = await query(
    `UPDATE HISTORIAL_AVANCE
     SET puntaje_obtenido = $2, duracion_minutos = $3
     WHERE id_historial = $1
     RETURNING *`,
    [idHistorial, puntaje, duracionMinutos]
  );
  return rows[0] ?? null;
}

// ---------- RESPUESTA_USUARIO ----------

/**
 * Registra la respuesta de un ejercicio dentro de un intento.
 * Si el ejercicio ya se respondió en ese intento, la última respuesta
 * reemplaza a la anterior (sin duplicados por intento+ejercicio).
 */
async function registrarRespuesta({ idHistorial, idEstudiante, idEjercicio, idAlternativa, esCorrecta }) {
  await query(
    'DELETE FROM RESPUESTA_USUARIO WHERE id_historial = $1 AND id_ejercicio = $2',
    [idHistorial, idEjercicio]
  );
  const { rows } = await query(
    `INSERT INTO RESPUESTA_USUARIO (id_historial, id_estudiante, id_ejercicio, id_alternativa, es_correcta)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [idHistorial, idEstudiante, idEjercicio, idAlternativa, esCorrecta]
  );
  return rows[0];
}

/** Aciertos y respuestas registradas de un intento. */
async function contarRespuestas(idHistorial) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS respondidas,
            COUNT(*) FILTER (WHERE es_correcta)::int AS correctas
     FROM RESPUESTA_USUARIO
     WHERE id_historial = $1`,
    [idHistorial]
  );
  return rows[0];
}

/** Detalle de respuestas de un intento (para la revisión al finalizar). */
async function respuestasDelHistorial(idHistorial) {
  const { rows } = await query(
    `SELECT id_ejercicio, es_correcta FROM RESPUESTA_USUARIO
     WHERE id_historial = $1
     ORDER BY id_ejercicio`,
    [idHistorial]
  );
  return rows;
}

// ---------- PROGRESO ----------

/**
 * Recalcula el progreso de un contenido: % de ejercicios con al menos una
 * respuesta correcta del estudiante (RF-13).
 */
async function recalcularContenido(idEstudiante, idContenido) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total,
            COUNT(ru.id_ejercicio) AS logrados
     FROM EJERCICIO e
     LEFT JOIN (
       SELECT DISTINCT id_ejercicio
       FROM RESPUESTA_USUARIO
       WHERE id_estudiante = $1 AND es_correcta
     ) ru ON ru.id_ejercicio = e.id_ejercicio
     WHERE e.id_contenido = $2`,
    [idEstudiante, idContenido]
  );
  const { total, logrados } = rows[0];
  const porcentaje = total === 0 ? 0 : Math.round((logrados / total) * 10000) / 100;
  const { rows: guardado } = await query(
    `INSERT INTO PROGRESO (id_estudiante, id_contenido, completado, porcentaje)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id_estudiante, id_contenido)
     DO UPDATE SET completado = EXCLUDED.completado,
                   porcentaje = EXCLUDED.porcentaje,
                   fecha_actualizacion = CURRENT_TIMESTAMP
     RETURNING id_progreso, completado, porcentaje::float AS porcentaje, fecha_actualizacion`,
    [idEstudiante, idContenido, porcentaje >= 100, porcentaje]
  );
  return guardado[0];
}

/** Porcentaje de progreso promedio por eje temático (panel RF-13/CP-18). */
async function progresoPorEje(idEstudiante) {
  const { rows } = await query(
    `SELECT e.id_eje, e.nombre,
            COALESCE(ROUND(AVG(COALESCE(p.porcentaje, 0))::numeric, 1), 0)::float AS porcentaje
     FROM EJE_TEMATICO e
     LEFT JOIN CONTENIDO c ON c.id_eje = e.id_eje
     LEFT JOIN PROGRESO p ON p.id_contenido = c.id_contenido AND p.id_estudiante = $1
     GROUP BY e.id_eje
     ORDER BY e.id_eje`,
    [idEstudiante]
  );
  return rows;
}

/** Resumen global: prácticas, simulacros rendidos y mejores puntajes. */
async function resumen(idEstudiante) {
  const { rows } = await query(
    `SELECT
       COUNT(*) FILTER (WHERE h.tipo_actividad = 'PRACTICA_LECCION')::int AS practicas,
       -- Solo los intentos finalizados cuentan como simulacros rendidos
       -- (los abiertos siguen con puntaje 0, ver la función "intentar").
       COUNT(*) FILTER (WHERE h.tipo_actividad = 'SIMULACRO_OFICIAL' AND h.puntaje_obtenido > 0)::int AS simulacros,
       COALESCE(MAX(h.puntaje_obtenido) FILTER (WHERE h.tipo_actividad = 'SIMULACRO_OFICIAL' AND h.puntaje_obtenido > 0), 0)::float AS mejor_puntaje,
       COALESCE(ROUND(AVG(h.puntaje_obtenido) FILTER (WHERE h.tipo_actividad = 'SIMULACRO_OFICIAL' AND h.puntaje_obtenido > 0)::numeric, 1), 0)::float AS promedio_puntaje
     FROM HISTORIAL_AVANCE h
     WHERE h.id_estudiante = $1`,
    [idEstudiante]
  );
  return rows[0];
}

/** Últimos movimientos del estudiante (panel de progreso). */
async function historial(idEstudiante, limite = 10) {
  const { rows } = await query(
    `SELECT h.id_historial, h.tipo_actividad, h.puntaje_obtenido::float AS puntaje_obtenido,
            h.duracion_minutos, h.fecha_realizacion, s.nombre AS simulacro
     FROM HISTORIAL_AVANCE h
     LEFT JOIN SIMULACRO s ON s.id_simulacro = h.id_simulacro
     WHERE h.id_estudiante = $1
     ORDER BY h.fecha_realizacion DESC, h.id_historial DESC
     LIMIT $2`,
    [idEstudiante, limite]
  );
  return rows;
}

module.exports = {
  crearHistorial,
  porId,
  finalizarHistorial,
  registrarRespuesta,
  contarRespuestas,
  respuestasDelHistorial,
  recalcularContenido,
  progresoPorEje,
  resumen,
  historial,
};
