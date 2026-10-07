'use strict';

const { query } = require('../db/pool');

/**
 * Repositorio de reportería de la Fase 4:
 * - `reporteInstitucion` (RF-14): rendimiento consolidado de una sede.
 * - `metricasGlobales` (RF-17): concurrencia y actividad agregadas.
 */

/** Resumen de alumnos y actividad de la sede (RF-14). */
async function resumenInstitucion(idInstitucion) {
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM USUARIO u
         JOIN ROL r ON r.id_rol = u.id_rol
         WHERE u.id_institucion = $1 AND r.nombre_rol = 'ESTUDIANTE') AS estudiantes,
       (SELECT COUNT(*)::int FROM USUARIO u
         JOIN ROL r ON r.id_rol = u.id_rol
         WHERE u.id_institucion = $1 AND r.nombre_rol = 'ESTUDIANTE' AND u.activo) AS activos,
       COALESCE((SELECT COUNT(*) FROM HISTORIAL_AVANCE h
         JOIN USUARIO u ON u.id_usuario = h.id_estudiante
         WHERE u.id_institucion = $1 AND h.tipo_actividad = 'PRACTICA_LECCION'), 0)::int AS practicas,
       COALESCE((SELECT COUNT(*) FROM HISTORIAL_AVANCE h
         JOIN USUARIO u ON u.id_usuario = h.id_estudiante
         WHERE u.id_institucion = $1 AND h.tipo_actividad = 'SIMULACRO_OFICIAL'
           AND h.puntaje_obtenido > 0), 0)::int AS simulacros,
       COALESCE((SELECT ROUND(AVG(h.puntaje_obtenido)::numeric, 1) FROM HISTORIAL_AVANCE h
         JOIN USUARIO u ON u.id_usuario = h.id_estudiante
         WHERE u.id_institucion = $1 AND h.tipo_actividad = 'SIMULACRO_OFICIAL'
           AND h.puntaje_obtenido > 0), 0)::float AS promedio_puntaje,
       COALESCE((SELECT MAX(h.puntaje_obtenido) FROM HISTORIAL_AVANCE h
         JOIN USUARIO u ON u.id_usuario = h.id_estudiante
         WHERE u.id_institucion = $1 AND h.tipo_actividad = 'SIMULACRO_OFICIAL'
           AND h.puntaje_obtenido > 0), 0)::float AS mejor_puntaje`,
    [idInstitucion]
  );
  return rows[0];
}

/**
 * Progreso promedio y aciertos por eje para los alumnos de la sede,
 * ordenados del eje **más débil al más fuerte** (CP-19: áreas débiles).
 */
async function ejesInstitucion(idInstitucion) {
  const { rows } = await query(
    `SELECT e.id_eje, e.nombre,
            COALESCE(ROUND(AVG(COALESCE(p.porcentaje, 0))::numeric, 1), 0)::float AS progreso_promedio,
            COALESCE(sub.respuestas, 0)::int AS respuestas,
            COALESCE(sub.aciertos, 0)::int AS aciertos
     FROM EJE_TEMATICO e
     LEFT JOIN CONTENIDO c ON c.id_eje = e.id_eje
     LEFT JOIN ROL r ON r.nombre_rol = 'ESTUDIANTE'
     LEFT JOIN USUARIO u ON u.id_institucion = $1 AND u.id_rol = r.id_rol
     LEFT JOIN PROGRESO p ON p.id_contenido = c.id_contenido
       AND p.id_estudiante = u.id_usuario
     LEFT JOIN (
       SELECT e2.id_eje,
              COUNT(*) AS respuestas,
              COUNT(*) FILTER (WHERE ru.es_correcta) AS aciertos
       FROM RESPUESTA_USUARIO ru
       JOIN EJERCICIO ej ON ej.id_ejercicio = ru.id_ejercicio
       JOIN CONTENIDO c2 ON c2.id_contenido = ej.id_contenido
       JOIN EJE_TEMATICO e2 ON e2.id_eje = c2.id_eje
       JOIN USUARIO u2 ON u2.id_usuario = ru.id_estudiante AND u2.id_institucion = $1
       GROUP BY e2.id_eje
     ) sub ON sub.id_eje = e.id_eje
     GROUP BY e.id_eje, e.nombre, sub.respuestas, sub.aciertos
     ORDER BY progreso_promedio ASC, e.id_eje`,
    [idInstitucion]
  );
  return rows;
}

/**
 * Métricas globales de la plataforma (RF-17 — CP-20):
 * concurrencia (usuarios/sedes) y actividad (prácticas, simulacros,
 * respuestas y serie de los últimos 7 días).
 */
async function metricasGlobales() {
  const [concurrencia, porRol, porSuscripcion, instituciones, actividad, serie] =
    await Promise.all([
      query(
        `SELECT COUNT(*)::int AS usuarios,
                COUNT(*) FILTER (WHERE activo)::int AS usuarios_activos
         FROM USUARIO`
      ),
      query(
        `SELECT r.nombre_rol AS rol,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE u.activo)::int AS activos
         FROM USUARIO u
         JOIN ROL r ON r.id_rol = u.id_rol
         GROUP BY r.nombre_rol
         ORDER BY r.nombre_rol`
      ),
      query(
        `SELECT tipo_suscripcion AS suscripcion, COUNT(*)::int AS total
         FROM USUARIO GROUP BY tipo_suscripcion ORDER BY tipo_suscripcion`
      ),
      query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE activo)::int AS activas
         FROM INSTITUCION`
      ),
      query(
        `SELECT
           COUNT(*) FILTER (WHERE h.tipo_actividad = 'PRACTICA_LECCION')::int AS practicas,
           COUNT(*) FILTER (WHERE h.tipo_actividad = 'SIMULACRO_OFICIAL'
                              AND h.puntaje_obtenido > 0)::int AS simulacros,
           COALESCE(ROUND(AVG(h.puntaje_obtenido) FILTER (
             WHERE h.tipo_actividad = 'SIMULACRO_OFICIAL' AND h.puntaje_obtenido > 0
           )::numeric, 1), 0)::float AS puntaje_promedio,
           COUNT(*) FILTER (WHERE h.fecha_realizacion >= CURRENT_DATE)::int AS practicas_hoy,
           COUNT(*) FILTER (WHERE h.fecha_realizacion >= CURRENT_DATE - 7)::int AS ultimos_7_dias
         FROM HISTORIAL_AVANCE h`
      ),
      query(
        `SELECT to_char(d, 'YYYY-MM-DD') AS fecha,
                COALESCE((SELECT COUNT(*) FROM HISTORIAL_AVANCE h
                  WHERE h.fecha_realizacion::date = d
                    AND h.tipo_actividad = 'PRACTICA_LECCION'), 0)::int AS practicas,
                COALESCE((SELECT COUNT(*) FROM HISTORIAL_AVANCE h
                  WHERE h.fecha_realizacion::date = d
                    AND h.tipo_actividad = 'SIMULACRO_OFICIAL'
                    AND h.puntaje_obtenido > 0), 0)::int AS simulacros
         FROM generate_series(CURRENT_DATE - 6, CURRENT_DATE, '1 day') AS d
         ORDER BY d`
      ),
    ]);

  const respuestas = await query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE fecha_respuesta >= CURRENT_DATE - 7)::int AS ultimos_7_dias
     FROM RESPUESTA_USUARIO`
  );

  return {
    concurrencia: {
      ...concurrencia.rows[0],
      instituciones: instituciones.rows[0].total,
      institucionesActivas: instituciones.rows[0].activas,
      porRol: porRol.rows,
      porSuscripcion: porSuscripcion.rows,
    },
    actividad: { ...actividad.rows[0], respuestas: respuestas.rows[0].total,
      respuestasUltimos7Dias: respuestas.rows[0].ultimos_7_dias },
    serie: serie.rows,
  };
}

module.exports = { resumenInstitucion, ejesInstitucion, metricasGlobales };
